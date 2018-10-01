import { Store } from 'redux'
import { VynosPurchase } from '../VynosPurchase'
import VynosBuyResponse from '../VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import * as actions from '../../worker/actions'
import {
  PurchaseMeta, PaymentMeta, ChannelType, PaymentObject, IConnext,
  VirtualChannel, UpdateBalancesResult,
} from '../connext/ConnextTypes'
import { WorkerState, ChannelState, CurrencyType as C } from '../../worker/WorkerState'
import LockStateObserver from '../LockStateObserver'
import { AtomicTransaction } from './AtomicTransaction'
import {closeAllVCs} from '../connext/closeAllVCs'
import {INITIAL_DEPOSIT_BOOTY} from '../constants'
import takeSem from '../takeSem'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import getChannels from '../connext/getChannels'
import Logger from '../Logger'
import Currency from '../currency/Currency'

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


export default class BuyTransaction {
  static DEFAULT_DEPOSIT = new Currency(C.BOOTY, INITIAL_DEPOSIT_BOOTY.toString())

  private doBuyTransaction: AtomicTransaction<VynosBuyResponse, _Args<BuyTransaction['getExistingChannel']>>
  private connext: IConnext
  private store: Store<WorkerState>
  private sem: semaphore.Semaphore

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, sem: semaphore.Semaphore) {
    this.store = store
    this.connext = connext
    this.sem = sem

    const methodOrder = [
      this.getExistingChannel,
      this.getVC,
      this.updateBalance,
      this.updateStore,
    ]
    this.doBuyTransaction = new AtomicTransaction(this.store, logger, 'buy', methodOrder)
  }

  public startTransaction = async (purchase: VynosPurchase): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(purchase)
  }

  public restartTransaction = async (): Promise<VynosBuyResponse|null> => {
    if (!this.isInProgress()) {
      return null
    }
    return takeSem<VynosBuyResponse|null>(
      this.sem, 
      () => this.doBuyTransaction.restart()
    )
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

    // For now, to simplify the camsite, replace the magical value '$$HUB$$'
    // with Ingrid's address (so the camsite doesn't need to know what it is)
    if (recipients[0] == '$$HUB$$') {
      recipients[0] = lcState.lc.partyI
      purchase.payments[0].receiver = lcState.lc.partyI
    }

    if (recipients[0] != lcState.lc.partyI) {
      // As above, this constraint can be relaxed in the future.
      throw new Error(
        `Expected the first recipient to be Ingrid ('${lcState.lc.partyI}') ` +
        `but it is not: ${JSON.stringify(recipients)}`
      )
    }

    const existingVC: VirtualChannel|undefined = lcState.currentVCs
      .find((testVc: VirtualChannel) => recipients[1] == testVc.partyB)

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
    const [ lcPayment, vcPayment ] = purchase.payments
    const lc = lcState.lc
    const connextUpdate: PaymentObject[] = [
      {
        type: ChannelType.LEDGER,
        meta: {
          receiver: lc.partyI,
          type: lcPayment.type,
          fields: {
            ...lcPayment.fields,
            // Note: for now, copy the purchase fields onto both the payments.
            // Eventually this should be replaced with a first-class "purchase"
            // type which will store the fields... but this will do for now.
            ...purchase.fields,
          } as any,
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
          // Note: for backwards compatibility, allow use the purchase' type to
          // reduce the amount we'll need to change on the hub side. Eventually
          // this type should come entirely from the purchase, though.
          type: purchase.type,
          fields: {
            ...vcPayment.fields,
            // Note: for now, copy the purchase fields onto both the payments.
            // Eventually this should be replaced with a first-class "purchase"
            // type which will store the fields... but this will do for now.
            ...purchase.fields,
            originalType: vcPayment.type,
          } as any,
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
      },
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

    const deposit: Currency = await this.getBootyDepositAmount(price)
    if (deposit.type != C.BOOTY) {
      // As above, for the moment, we're using exclusively BOOTY, so this is
      // a safe check. In the future this will need to be generalized.
      throw new Error('For now, VCs must be created with BOOTY (but got: ' + deposit.type + ')')
    }

    let newVCId: string
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
    const available = await this.getAvailableLCBalanceInBOOTY()
    const dflt = BuyTransaction.DEFAULT_DEPOSIT

    if (priceBOOTY.compare('gt', available)) {
      throw new Error(
        `The price cannot be larger than the available LC balance when opening a new channel. ` +
        `Price (BOOTY): ${priceBOOTY.amountBigNumber.div('1e18').toFixed()} ` +
        `availableLcBalance (BOOTY): ${available.amountBigNumber.div('1e18').toFixed()}`
      )
    }

    if (available.compare('lt', dflt))
      return available

    if (priceBOOTY.compare('gt', dflt))
      return priceBOOTY

    return dflt
  }

  private getAvailableLCBalanceInBOOTY = async (): Promise<Currency<C.BOOTY>> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    return new Currency(C.BOOTY, channels[0].tokenBalanceA)
  }
}
