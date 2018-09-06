import { Store } from 'redux'
import VynosBuyResponse from './VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import { Meta, ChannelType, PaymentObject, IConnext } from "./connext/ConnextTypes";
import * as actions from '../worker/actions'
import { AtomicTransaction, TransactionInterface } from './AtomicTransaction'
import { WorkerState, ChannelState,CurrencyType } from '../worker/WorkerState'
import LockStateObserver from './LockStateObserver'
import {closeAllVCs} from './connext/closeAllVCs'
import {TEN_FINNEY} from './constants'
import takeSem from './takeSem'
import VirtualChannel from './connext/VirtualChannel'
import getCurrentLedgerChannels from './connext/getCurrentLedgerChannels'
import Currency from './Currency'

/**
 * The BuyTransaction handles purchases and tips
 * It executes Buys, restarts halted buys,
 * and automatically opening new virtual channels
 * when no channel exists or the current channel is
 * not large enough.
 *
 * Author: William Cory -- GitHub: roninjin10
 */


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

  public startTransaction = async (priceWEI: Currency, meta: Meta): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(priceWEI, meta)
  }

  public restartTransaction = async (): Promise<VynosBuyResponse|undefined> => {
    if (this.isInProgress()) {
      return takeSem<VynosBuyResponse>(this.sem, () => this.doBuyTransaction.restart())
    }
  }

  public isInProgress = (): boolean => this.doBuyTransaction.isInProgress()

  private getExistingChannel = (priceWEI: Currency, meta: Meta): [Currency, Meta, ChannelState] => {
    const existingChannel = this.store.getState().runtime.channel
    if (!existingChannel) {
      throw new Error('A channel must be open')
    }
    return [priceWEI, meta, existingChannel]
  }

  private getVC = async (priceWEI: Currency, meta: Meta, existingChannel: ChannelState): Promise<[Currency, Meta, ChannelState, VirtualChannel]> => {
    const existingVC: VirtualChannel|undefined = existingChannel.currentVCs
      .find((testVc: VirtualChannel) => testVc.partyB === meta.receiver)

    const vc = existingVC && priceWEI.amountBN.lte(new BN(existingVC.ethBalanceA))
      ? existingVC
      : await this.createNewVC(meta.receiver, priceWEI)
    console.log('vc', vc)
    return [
      priceWEI,
      meta,
      existingChannel,
      vc,
    ]
  }

  private updateBalance = async (priceWEI: Currency, meta: Meta, existingChannel: ChannelState, vc: VirtualChannel): Promise<[Currency, Meta, ChannelState, VirtualChannel, string]> => {
    const balA = new BN(vc.ethBalanceA).sub(priceWEI.amountBN)
    const balB = new BN(vc.ethBalanceB).add(priceWEI.amountBN)

    const connextUpdate: PaymentObject[] = [
      {
        payment: {
          balanceA: {
            ethDeposit: balA
          },
          balanceB: {
            ethDeposit: balB
          },
          channelId: vc.channelId,
        },
        meta,
        type: ChannelType.VIRTUAL // this is hardcoded atm
      }
    ]

    let res: any

    try {
      res = await this.connext.updateBalances(connextUpdate, vc.partyA)
    } catch (e) {
      console.error('connext.updateBalances failed')
      throw e
    }

    const vcCopy: VirtualChannel = JSON.parse(JSON.stringify(vc))
    vcCopy.ethBalanceA = balA.toString()
    vcCopy.ethBalanceB = balB.toString()

    return [
      priceWEI,
      meta,
      existingChannel,
      vcCopy,
      res[0].id.toString()
    ]
  }

  private updateStore = (priceWEI: Currency, meta: Meta, existingChannel: ChannelState, vc: any, id: string): {channelId: string, token: string} => {
    const oldChannel = this.store.getState().runtime.channel
    if (!oldChannel) {
      throw new Error('channel cannot be null or undefined')
    }

    const oldBalance = new BN(oldChannel.balance)
    const newBalance = oldBalance.sub(priceWEI.amountBN)

    this.store.dispatch(actions.setChannel({
      ledgerId: existingChannel.ledgerId,
      balance: newBalance.toString(),
      currentVCs: [ vc ],
    }))

    return {
      channelId: vc.channelId,
      token: id,
    }
  }

  // helpers
  private createNewVC = async (receiver: string, priceWEI: Currency): Promise<VirtualChannel> => {
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
