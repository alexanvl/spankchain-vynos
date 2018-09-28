import { Store } from 'redux'
import VynosBuyResponse from '../VynosBuyResponse'
import BN = require('bn.js')
import * as semaphore from 'semaphore'
import { Meta, ChannelType, PaymentObject, IConnext, VirtualChannel} from '../connext/ConnextTypes'
import * as actions from '../../worker/actions'
import { AtomicTransaction } from './AtomicTransaction'
import { WorkerState, ChannelState,CurrencyType } from '../../worker/WorkerState'
import {closeAllVCs} from '../connext/closeAllVCs'
import {TEN_FINNEY} from '../constants'
import takeSem from '../takeSem'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import Currency from '../currency/Currency'
import getChannels from '../connext/getChannels'
import Logger from '../Logger'

/**
 * The BuyTransaction handles purchases and tips
 * It executes Buys, restarts halted buys,
 * and automatically opening new virtual channels
 * when no channel exists or the current channel is
 * not large enough.
 *
 * Author: William Cory -- GitHub: roninjin10
 */

export default class BuyTransaction {
  static DEFAULT_DEPOSIT = new Currency(CurrencyType.WEI, TEN_FINNEY.toString(10))

  private doBuyTransaction: AtomicTransaction<VynosBuyResponse, [Currency, Meta]>
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
    this.doBuyTransaction = new AtomicTransaction<VynosBuyResponse, [Currency, Meta]>(this.store, logger, 'buy', methodOrder)
  }

  public startTransaction = (priceWEI: Currency, meta: Meta): Promise<VynosBuyResponse> => this.doBuyTransaction.start(priceWEI, meta)

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

  private getExistingChannel = async (priceWEI: Currency, meta: Meta): Promise<[Currency, Meta, ChannelState]> => {
    const existingChannel = await getChannels(this.connext, this.store)
    if (!existingChannel) {
      throw new Error('A channel must be open')
    }
    return [priceWEI, meta, existingChannel]
  }

  private getVC = async (priceWEI: Currency, meta: Meta, existingChannel: ChannelState): Promise<[Currency, Meta, VirtualChannel]> => {
    const existingVC: VirtualChannel|undefined = existingChannel.currentVCs
      .find((testVc: VirtualChannel) => testVc.partyB === meta.receiver)

    const vc = existingVC && priceWEI.amountBN.lte(new BN(existingVC.ethBalanceA))
      ? existingVC
      : await this.createNewVC(meta.receiver, priceWEI)

      return [
      priceWEI,
      meta,
      vc,
    ]
  }

  private updateBalance = async (
    priceWEI: Currency,
    meta: Meta,
    vc: VirtualChannel
  ): Promise<[VirtualChannel, string]> => {
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
      vcCopy,
      res[0].id.toString()
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
    const ethDeposit: Currency = await this.getEthDepositAmountInWEI(priceWEI)

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

  private getEthDepositAmountInWEI = async (priceWEI: Currency): Promise<Currency> => {
    const availableWEI: Currency = await this.getAvailableLCBalanceInWEI()
    const defaultWEI: Currency = BuyTransaction.DEFAULT_DEPOSIT

    if (priceWEI.amountBN.gt(availableWEI.amountBN)) {
      throw new Error(`
        The price cannot be larger than the available LC balance when opening a new channel.
        Price: ${priceWEI.amountBN.toString(10)} availableLcBalance: ${availableWEI.amountBN.toString(10)}
      `)
    }

    if (availableWEI.amountBN.lt(defaultWEI.amountBN)) {
      return availableWEI
    }

    if (priceWEI.amountBN.gt(defaultWEI.amountBN)) {
      return priceWEI
    }

    return defaultWEI
  }

  private getAvailableLCBalanceInWEI = async (): Promise<Currency> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    return new Currency(CurrencyType.WEI, channels[0].ethBalanceA)
  }
}
