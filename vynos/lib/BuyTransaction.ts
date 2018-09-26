import { Store } from 'redux'
import { VynosPurchase } from './VynosPurchase'
import VynosBuyResponse from './VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import { PurchaseMeta, PaymentMeta, ChannelType, PaymentObject, IConnext, VirtualChannel} from "./connext/ConnextTypes";
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
    const lc = await getChannels(this.connext, this.store)
    if (!lc) {
      throw new Error('A channel must be open')
    }
    return [purchase, lc]
  }

  private getVC = async (
    purchase: VynosPurchase,
    lc: ChannelState,
  ): Promise<_Args<BuyTransaction['updateBalance']>> => {
    const recipients = purchase.payments.map(p => p.recipient)
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

    if (recipients[0] == lc.currentLC.partyI) {
      // As above, this constraint can be relaxed in the future.
      throw new Error(
        `Expected the first recipient to be Ingrid ('${lc.currentLC.partyI}') ` +
        `but it is not: ${JSON.stringify(recipients)}`
      )
    }

    const existingVC: VirtualChannel|undefined = lc.currentVCs
      .find((testVc: VirtualChannel) => recipients[1] == testVc.partyB)

    // TODO: make sure the 'tokenBalanceA' is available
    const vc = existingVC && purchase.payments[1].amount.compare('lte', existingVC.tokenBalanceA, C.BOOTY)
      ? existingVC
      : await this.createNewVC(recipients[1], purchase.payments[1].amount)

      return [purchase, lc, vc]
  }

  private updateBalance = async (
    purchase: VynosPurchase,
    lc: ChannelState,
    vc: VirtualChannel,
  ): Promise<_Args<BuyTransaction['updateStore']>> => {
    // OLD: const balA = new BN(vc.ethBalanceA).sub(priceWEI.amountBN)
    // OLD: const balB = new BN(vc.ethBalanceB).add(priceWEI.amountBN)

    // OLD: const connextUpdate: PaymentObject[] = [
    // OLD:   {
    // OLD:     payment: {
    // OLD:       balanceA: {
    // OLD:         ethDeposit: balA
    // OLD:       },
    // OLD:       balanceB: {
    // OLD:         ethDeposit: balB
    // OLD:       },
    // OLD:       channelId: vc.channelId,
    // OLD:     },
    // OLD:     meta,
    // OLD:     type: ChannelType.VIRTUAL // this is hardcoded atm
    // OLD:   }
    // OLD: ]

    const connextUpdate: PaymentObject[] = purchase.payments.map(p => {
      return convertPaymentToPaymentObject(p)
    })

    let res: any

    try {
      res = await this.connext.updateBalances(connextUpdate, vc.partyA)
    } catch (e) {
      console.error('connext.updateBalances failed')
      throw e
    }

    // OLD: const vcCopy: VirtualChannel = JSON.parse(JSON.stringify(vc))
    // OLD: vcCopy.ethBalanceA = balA.toString()
    // OLD: vcCopy.ethBalanceB = balB.toString()

    return [
      updateLCFromPayment(lc, payment),
      updateVCFromPayment(vc, payment),
      res,
    ]
  }

  private updateStore = async (
    lc: ChannelState,
    vc: VirtualChannel,
    id: string
  ): Promise<{channelId: string, token: string}> => {
    this.store.dispatch(actions.setChannel(
      await getChannels(this.connext, this.store)
    ))

    return {
      channelId: vc.channelId,
      token: id,
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

    if (deposit.currency != C.BOOTY as any) {
      // As above, for the moment, we're using exclusively BOOTY, so this is
      // a safe check. In the future this will need to be generalized.
      throw new Error('For now, VCs must be created with BOOTY')
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
      throw new Error(`
        The price cannot be larger than the available LC balance when opening a new channel.
        Price: ${priceBOOTY.amountBN.toString()} availableLcBalance: ${AVAILABLE.amountBN.toString()}
      `)
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
