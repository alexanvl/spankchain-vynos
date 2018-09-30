import {Store} from 'redux'
import * as semaphore from 'semaphore'
import * as actions from '../../worker/actions'
import {AtomicTransaction} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import withRetries from '../withRetries'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import ChannelPopulator, {DeferredPopulator} from '../ChannelPopulator'
import {IConnext} from '../connext/ConnextTypes'
import Logger from '../Logger'
import Exchange from './Exchange'

/**
 * The CloseChannelTransaction handles starting new withdrawals as well
 * as automatically restarting new withdrawals.  CloseChannelTransaction
 * hasa AtomicTransaction which allows withdrawals to restart should
 * a user close their browser.
 *
 * Author: William Cory -- GitHub: roninjin10
 */

export default class CloseChannelTransaction {
  private doCloseChannel: AtomicTransaction<void>
  private connext: IConnext
  private store: Store<WorkerState>
  private chanPopulator: ChannelPopulator
  private deferredPopulate: DeferredPopulator|null
  private exchange: Exchange

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, sem: semaphore.Semaphore, chanPopulator: ChannelPopulator) {
    this.store = store
    this.connext = connext
    this.chanPopulator = chanPopulator
    this.deferredPopulate = null

    const methodOrder = [
      this.closeAllVCs,
      this.swapForEth,
      this.withdraw,
      this.pingChainsaw,
      this.updateRedux
    ]

    this.doCloseChannel = new AtomicTransaction(
      this.store,
      logger,
      'withdrawal',
      methodOrder,
      this.afterAll,
      this.setHasActiveWithdrawal,
      this.setHasActiveWithdrawal
    )

    this.exchange = new Exchange(store, logger, connext)
  }

  public execute = async (): Promise<void> => {
    try {
      if (this.doCloseChannel.isInProgress()) {
        await this.doCloseChannel.restart()
      }

      await this.doCloseChannel.start()
    } catch (e) {
      this.releaseDeferred()
      throw e
    }
  }

  private setHasActiveWithdrawal = async () => {
    this.store.dispatch(actions.setHasActiveWithdrawal(true))
    this.deferredPopulate = await this.chanPopulator.populateDeferred()
  }

  private closeAllVCs = async (): Promise<void> => {
    const channel = this.store.getState().runtime.channel

    if (!channel || channel.currentVCs.length === 0) {
      return
    }
    try{
      this.connext.closeThreads(channel.currentVCs.map((vc) => vc.channelId) as any)
      return
    } catch(e) {
      console.error('connext.closeThreads failed', e)
      throw e
    }
  }

  private swapForEth = () => {
    if (!this.isBootySupport()) {
      return
    }

    // on a restart of CloseChannelTransaction we might need to restart the exchange
    if (this.exchange.isInProgress()) {
      this.exchange.restartSwap()
      return
    }

    this.exchange.swapBootyForEth()
  }

  private withdraw = async (): Promise<void> => {
    try {
      await this.connext.closeChannel()
    } catch (e) {
      if (e.statusCode === 651) {
        console.error('hub did not cosign proposed LC update', e)
        this.contactSupport()
        return
      }
      console.error('connext.closeChannel failed for reason other than hub did not cosign proposed LC update', e)
      throw e
    }
  }

  private contactSupport (): void {
    actions.setActiveWithdrawalError('Withdrawal Failed.  Please contact support.')
  }

  private pingChainsaw = async (): Promise<void> => {
    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (res !== null) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    }, 24)
  }

  private updateRedux = async (): Promise<void> => {
    await this.deferredPopulate!.populate()
  }

  private afterAll = (): void => {
    this.store.dispatch(actions.setHasActiveWithdrawal(false))
    this.deferredPopulate = null
  }

  private releaseDeferred () {
    if (!this.deferredPopulate) {
      return
    }

    this.deferredPopulate.release()
    this.deferredPopulate = null
  }

  private isBootySupport = () => !!this.store.getState().runtime.featureFlags.bootySupport
}
