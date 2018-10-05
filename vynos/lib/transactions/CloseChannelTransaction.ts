import {Store} from 'redux'
import * as semaphore from 'semaphore'
import * as actions from '../../worker/actions'
import {AtomicTransaction, ensureMethodsHaveNames} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import withRetries, {DoneFunc} from '../withRetries'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import ChannelPopulator, {DeferredPopulator} from '../ChannelPopulator'
import {IConnext} from '../connext/ConnextTypes'
import Logger from '../Logger'

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
  private sem: semaphore.Semaphore
  private chanPopulator: ChannelPopulator
  private deferredPopulate: DeferredPopulator | null
  private logger: Logger

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, sem: semaphore.Semaphore, chanPopulator: ChannelPopulator) {
    ensureMethodsHaveNames(this)
    this.store = store
    this.logger = logger
    this.connext = connext
    this.sem = sem
    this.chanPopulator = chanPopulator
    this.deferredPopulate = null

    const methodOrder = [
      this.closeAllVCs,
      this.withdraw,
      this.pingChainsaw,
      this.updateRedux
    ]

    this.doCloseChannel = new AtomicTransaction(this.store, logger, 'withdrawal', methodOrder, this.afterAll, this.setHasActiveWithdrawal, this.setHasActiveWithdrawal)
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

  public isInProgress = async () => this.doCloseChannel.isInProgress()

  private setHasActiveWithdrawal = async () => {
    this.store.dispatch(actions.setHasActiveWithdrawal(true))
    this.deferredPopulate = await this.chanPopulator.populateDeferred()
  }

  private closeAllVCs = async (): Promise<void> => {
    const channel = this.store.getState().runtime.channel

    if (!channel || channel.currentVCs.length === 0) {
      return
    }

    try {
      await this.connext.closeThreads(channel.currentVCs.map((vc) => vc.channelId) as any)
      return
    } catch (e) {
      console.error('connext.closeThreads failed', e)
      throw e
    }
  }

  private withdraw = async (): Promise<void> => {
    const chans = await getCurrentLedgerChannels(this.connext, this.store)

    if (!chans) {
      return
    }

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
    await withRetries(async (done: DoneFunc) => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (res === null) {
        done()
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
}
