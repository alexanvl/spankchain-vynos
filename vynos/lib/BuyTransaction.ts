import { Store } from 'redux'
import VynosBuyResponse from './VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import { PurchaseMeta, PaymentMeta, ChannelType, PaymentObject, IConnext, VirtualChannel} from "./connext/ConnextTypes";
import * as actions from '../worker/actions'
import { AtomicTransaction, TransactionInterface } from './AtomicTransaction'
import { WorkerState, ChannelState,CurrencyType } from '../worker/WorkerState'
import LockStateObserver from './LockStateObserver'
import {closeAllVCs} from './connext/closeAllVCs'
import {TEN_FINNEY} from './constants'
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

// TODO: Myabe we can inherit from another interface here? Or maybe not?
interface XXXPayment {
  amount: Currency
  meta: PaymentMeta
}

type XXXPurchase = PurchaseMeta & {
  payments: XXXPayment[]
}


export default class BuyTransaction implements TransactionInterface {
  static DEFAULT_DEPOSIT = new Currency(CurrencyType.WEI, TEN_FINNEY.toString(10))

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

  public startTransaction = async (purchase: XXXPurchase): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(purchase)
  }

  public restartTransaction = async (): Promise<VynosBuyResponse|undefined> => {
    if (this.isInProgress()) {
      return takeSem<VynosBuyResponse>(this.sem, () => this.doBuyTransaction.restart())
    }
  }

  public isInProgress = (): boolean => this.doBuyTransaction.isInProgress()

  private getExistingChannel = async (purchase: XXXPurchase): Promise<[XXXPurchase, ChannelState]> => {
    const lc = await getChannels(this.connext, this.store)
    if (!lc) {
      throw new Error('A channel must be open')
    }
    return [purchase, lc]
  }

  private getVC = async (purchase: XXXPurchase, lc: ChannelState): Promise<[XXXPurchase, ChannelState, VirtualChannel]> => {
    let recipient = getPurcahseNonCustodialRecipient(purchase)
    let nonCustodialAmount = getPurchaseNonCustodialAmount(purchase)
    const existingVC: VirtualChannel|undefined = lc.currentVCs
      .find((testVc: VirtualChannel) => testVc.partyB === recipient)

    // TODO: this should be done using something like Currency.compare(...) to
    // make sure the two currencies are the same (ex, ETH isn't being compared
    // to BOOTY)
    const vc = existingVC && nonCustodialAmount.amountBN.lte(new BN(existingVC.ethBalanceA))
      ? existingVC
      : await this.createNewVC(recipient, nonCustodialAmount)

      return [purchase, lc, vc]
  }

  private updateBalance = async (
    purchase: XXXPurchase,
    lc: ChannelState,
    vc: VirtualChannel,
  ): Promise<[VirtualChannel, PurchaseResult]> => {
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
    priceWEI: Currency
  ): Promise<VirtualChannel> => {
    await closeAllVCs(this.store, this.connext)

    let newVCId: string
    const ethDeposit: Currency = await this.getEthDepositAmountInWei(priceWEI)

    try {
      newVCId = await this.connext.openThread({
        to: receiver,
        deposit: {
          ethDeposit: ethDeposit.amountBN
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

  private getEthDepositAmountInWei = async (priceWEI: Currency): Promise<Currency> => {
    const AVAILABLE: Currency = await this.getAvailableLCBalanceInWEI()
    const DEFAULT: Currency = BuyTransaction.DEFAULT_DEPOSIT

    if (priceWEI.amountBN.gt(AVAILABLE.amountBN)) {
      throw new Error(`
        The price cannot be larger than the available LC balance when opening a new channel.
        Price: ${priceWEI.amountBN.toString(10)} availableLcBalance: ${AVAILABLE.amountBN.toString(10)}
      `)
    }

    if (AVAILABLE.amountBN.lt(DEFAULT.amountBN)) {
      return AVAILABLE
    }

    if (priceWEI.amountBN.gt(DEFAULT.amountBN)) {
      return priceWEI
    }

    return DEFAULT
  }

  private getAvailableLCBalanceInWEI = async (): Promise<Currency> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    return new Currency(CurrencyType.WEI, channels[0].ethBalanceA)
  }
}
