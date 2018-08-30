import { Store } from 'redux'
import VynosBuyResponse from './VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import { Meta, ChannelState, ChannelType, PaymentObject } from "./BuyTransactionTypes";
import * as actions from '../worker/actions'
import { AtomicTransaction, TransactionInterface } from './AtomicTransaction'
import { WorkerState } from '../worker/WorkerState'
import LockStateObserver from './LockStateObserver'
import {closeAllVCs} from './connext/closeAllVCs'
import {TEN_FINNEY} from './constants'
import takeSem from './takeSem'
import VirtualChannel from './connext/VirtualChannel'

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
  private doBuyTransaction: AtomicTransaction
  private connext: any
  private store: Store<WorkerState>
  private lockStateObserver: LockStateObserver
  private sem: semaphore.Semaphore
  static DEFAULT_DEPOSIT: BN = TEN_FINNEY

  constructor (store: Store<WorkerState>, connext: any, lockStateObserver: LockStateObserver, sem: semaphore.Semaphore) {
    this.store = store
    this.connext = connext
    this.lockStateObserver = lockStateObserver
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

  public startTransaction = async (price: string, meta: Meta): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(price, meta)
  }

  public restartTransaction = async (): Promise<any> => {
    if (!this.isInProgress()) {
      return
    }
    return takeSem<VynosBuyResponse>(this.sem, () => {
      return this.doBuyTransaction.restart()
    })
  }

  public isInProgress = (): boolean => this.doBuyTransaction.isInProgress()

  private getExistingChannel = (price: string, meta: Meta): [string, Meta, ChannelState] => {
    const existingChannel = this.store.getState().runtime.channel
    if (!existingChannel) {
      throw new Error('A channel must be open')
    }
    return [price, meta, existingChannel]
  }

  private getVC = async (price: string, meta: Meta, existingChannel: ChannelState): Promise<any[]> => {
    const priceBn = new BN(String(price))
    const existingVC: VirtualChannel = existingChannel.currentVCs
      .find((testVc: VirtualChannel) => testVc.partyB === meta.receiver)

    const vc = existingVC && priceBn.lte(new BN(existingVC.ethBalanceA))
      ? existingVC
      : await this.createNewVC(meta.receiver, priceBn)

    return [
      price,
      meta,
      existingChannel,
      vc,
      priceBn,
    ]
  }

  private updateBalance = async (price: string, meta: Meta, existingChannel: ChannelState, vc: VirtualChannel, priceBn: BN): Promise<any[]> => {
    const balA = new BN(vc.ethBalanceA).sub(priceBn)
    const balB = new BN(vc.ethBalanceB).add(priceBn)

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
      price,
      meta,
      existingChannel,
      vcCopy,
      res[0].id.toString()
    ]
  }

  private updateStore = (price: string, meta: Meta, existingChannel: ChannelState, vc: any, id: string): {channelId: string, token: string} => {
    const oldChannel = this.store.getState().runtime.channel
    if (!oldChannel) {
      // making typescript happy
      throw new Error('channel is null or undefined')
    }
    const oldBalance = new BN(oldChannel.balance)
    const newBalance = oldBalance.sub(new BN(price))

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
  private createNewVC = async (receiver: string, priceBn: BN): Promise<any> => {
    await closeAllVCs(this.store, this.connext)

    let newVCId: string
    try {
      newVCId = await this.connext.openThread({
        to: receiver,
        deposit: {
          ethDeposit: priceBn.gt(BuyTransaction.DEFAULT_DEPOSIT) ? priceBn : BuyTransaction.DEFAULT_DEPOSIT,
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
}
