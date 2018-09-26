import { Store } from 'redux'
import { VynosPurchase } from './VynosPurchase'
import VynosBuyResponse from './VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import {
  PurchaseMeta, PaymentMeta, ChannelType, PaymentObject, IConnext,
  VirtualChannel, UpdateBalancesResult,
} from "./connext/ConnextTypes";
import * as actions from '../worker/actions'
import { AtomicTransaction, TransactionInterface } from './AtomicTransaction'
import { WorkerState, ChannelState, CurrencyType as C } from '../worker/WorkerState'
import LockStateObserver from './LockStateObserver'
import {closeAllVCs} from './connext/closeAllVCs'
import {INITIAL_DEPOSIT_BOOTY} from './constants'
import takeSem from './takeSem'
import getCurrentLedgerChannels from './connext/getCurrentLedgerChannels'
import Currency from './Currency'
import getChannels from './connext/getChannels';

/**
 * The BuyTransaction handles purchases and tips
 * It executes Buys, restarts halted buys,
 * and automatically opening new virtual channels
 * when no channel exists or the current channel is
 * not large enough.
 *
 * Author: William Cory -- GitHub: roninjin10
 */

type _Args<T> = T extends (...args: infer U) => any ? U : never

export default class BuyTransaction implements TransactionInterface {
  static DEFAULT_DEPOSIT = new Currency(C.BOOTY, INITIAL_DEPOSIT_BOOTY.toString())

  private doBuyTransaction: AtomicTransaction
  private connext: IConnext
  private store: Store<WorkerState>
  private sem: semaphore.Semaphore

  constructor (store: Store<WorkerState>, connext: IConnext, lockStateObserver: LockStateObserver, sem: semaphore.Semaphore) {
    this.store = store
    this.connext = connext
    this.sem = sem

    const methodOrder = [
      this.getExistingChannel,
      this.getVC,
      this.updateBalance,
      this.updateStore,
    ]
    this.doBuyTransaction = new AtomicTransaction(this.store, 'buy', methodOrder)

    lockStateObserver.addUnlockHandler(this.restartTransaction)
    if (!lockStateObserver.isLocked()) {
      this.restartTransaction()
    }
  }

  public startTransaction = async (purchase: VynosPurchase): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(purchase)
  }

  public restartTransaction = async (): Promise<VynosBuyResponse|undefined> => {
    if (this.isInProgress()) {
      return takeSem<VynosBuyResponse>(this.sem, () => this.doBuyTransaction.restart())
    }
  }

  public isInProgress = (): boolean => this.doBuyTransaction.isInProgress()

  private getExistingChannel = async (purchase: VynosPurchase<C.BOOTY>): Promise<_Args<BuyTransaction['getVC']>> => {
    const lcState = await getChannels(this.connext, this.store)
    if (!lcState) {
      throw new Error('A channel must be open')
    }
    return [purchase, lcState]
  }

  private getVC = async (
    purchase: VynosPurchase,
    lcState: ChannelState,
  ): Promise<_Args<BuyTransaction['updateBalance']>> => {
    const recipients = purchase.payments.map(p => p.receiver)
    if (recipients.length != 2) {
      // For now, assume that payments have exactly two recipients: Ingrid and
      // Bob (in that order). In the future we'll need to relax this constraint
      // (to handle LC-only, VC-only, and non-custodial payments), but it's
      // safe to make this assumption for now.
      throw new Error(
        'Incorrect number of purcahse recipients; 2 expected, but got: ' +
        JSON.stringify(recipients)
      )
    }

    if (recipients[0] != lcState.currentLC.partyI) {
      // As above, this constraint can be relaxed in the future.
      throw new Error(
        `Expected the first recipient to be Ingrid ('${lcState.currentLC.partyI}') ` +
        `but it is not: ${JSON.stringify(recipients)}`
      )
    }

    const existingVC: VirtualChannel|undefined = lcState.currentVCs
      .find((testVc: VirtualChannel) => recipients[1] == testVc.partyB)

    // TODO: make sure the 'tokenBalanceA' is available
    let vcAmount = new Currency(purchase.payments[1].amount)
    const vc = existingVC && vcAmount.compare('lte', existingVC.tokenBalanceA, C.BOOTY)
      ? existingVC
      : await this.createNewVC(recipients[1], vcAmount)

      return [purchase, lcState, vc]
  }

  private updateBalance = async (
    purchase: VynosPurchase<C.BOOTY>,
    lcState: ChannelState,
    vc: VirtualChannel,
  ): Promise<_Args<BuyTransaction['updateStore']>> => {
    // As noted above, for now the first payment in the purchase is always
    // the LC payment and the second purchase is always the VC payment.
    let [ lcPayment, vcPayment ] = purchase.payments
    let lc = lcState.currentLC
    const connextUpdate: PaymentObject[] = [
      {
        type: ChannelType.LEDGER,
        meta: {
          receiver: lc.partyI,
          type: lcPayment.type,
          fields: lcPayment.fields,
        },
        payment: {
          channelId: lc.channelId,
          balanceA: {
            tokenDeposit: new BN(lc.tokenBalanceA).sub(new BN(lcPayment.amount.amount)),
          },
          balanceB: {
            tokenDeposit: new BN(lc.tokenBalanceI).add(new BN(lcPayment.amount.amount)),
          },
        },
      },

      {
        type: ChannelType.VIRTUAL,
        meta: {
          receiver: vc.partyB,
          type: vcPayment.type,
          fields: vcPayment.fields,
        },
        payment: {
          channelId: vc.channelId,
          balanceA: {
            tokenDeposit: new BN(vc.tokenBalanceA).sub(new BN(vcPayment.amount.amount)),
          },
          balanceB: {
            tokenDeposit: new BN(vc.tokenBalanceB).add(new BN(vcPayment.amount.amount)),
          },
        },
      }
    ]

    let res: any

    try {
      res = await this.connext.updateBalances(connextUpdate, vc.partyA)
    } catch (e) {
      console.error('connext.updateBalances failed')
      throw e
    }

    return [
      vc.channelId,
      res,
    ]
  }

  private updateStore = async (
    vcId: string,
    result: UpdateBalancesResult,
  ): Promise<{channelId: string, result: UpdateBalancesResult}> => {
    this.store.dispatch(actions.setChannel(
      await getChannels(this.connext, this.store)
    ))

    return {
      channelId: vcId,
      result,
    }
  }

  // helpers
  private createNewVC = async (
    receiver: string,
    price: Currency<C.BOOTY>,
  ): Promise<VirtualChannel> => {
    await closeAllVCs(this.store, this.connext)

    let newVCId: string
    const deposit: Currency = await this.getBootyDepositAmount(price)

    if (deposit.type != C.BOOTY) {
      // As above, for the moment, we're using exclusively BOOTY, so this is
      // a safe check. In the future this will need to be generalized.
      throw new Error('For now, VCs must be created with BOOTY (but got: ' + deposit.type + ')')
    }

    try {
      newVCId = await this.connext.openThread({
        to: receiver,
        deposit: {
          tokenDeposit: deposit.amountBN,
        }
      })
    } catch(e) {
      console.error('connext.openThread failed', e)
      throw e
    }
    try {
      return await this.connext.getThreadById(newVCId)
    } catch(e) {
      console.error('connext.getThreadById failed', e)
      throw e
    }
  }

  private getBootyDepositAmount = async (priceBOOTY: Currency<C.BOOTY>): Promise<Currency> => {
    const AVAILABLE = await this.getAvailableLCBalanceInBOOTY()
    const DEFAULT = BuyTransaction.DEFAULT_DEPOSIT

    if (priceBOOTY.compare('gt', AVAILABLE)) {
      throw new Error(
        `The price cannot be larger than the available LC balance when opening a new channel. ` +
        `Price (BOOTY): ${priceBOOTY.amountBigNumber.div('1e18').toFixed()} ` +
        `availableLcBalance (BOOTY): ${AVAILABLE.amountBigNumber.div('1e18').toFixed()}`
      )
    }

    if (AVAILABLE.compare('lt', DEFAULT)) {
      return AVAILABLE
    }

    if (priceBOOTY.compare('gt', DEFAULT)) {
      return priceBOOTY
    }

    return DEFAULT
  }

  private getAvailableLCBalanceInBOOTY = async (): Promise<Currency<C.BOOTY>> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    return new Currency(C.BOOTY, channels[0].tokenBalanceA)
  }
}
