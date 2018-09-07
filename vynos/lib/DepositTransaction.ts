import {Store} from 'redux'
import * as semaphore from 'semaphore'
import takeSem from './takeSem'
import * as actions from '../worker/actions'
import {AtomicTransaction, TransactionInterface} from './AtomicTransaction'
import {WorkerState} from '../worker/WorkerState'
import withRetries from './withRetries'
import getCurrentLedgerChannels from './connext/getCurrentLedgerChannels'
import LockStateObserver from './LockStateObserver'
import ChannelPopulator, {DeferredPopulator} from './ChannelPopulator'
import BN = require('bn.js')
import {IConnext, Deposit} from './connext/ConnextTypes'

/**
 * The DepositTransaction handles starting new deposits as well
 * as automatically restarting new deposits.  DepositTransaction
 * hasa AtomicTransaction which allows deposits to restart should
 * a user close their browser.
 *
 * Author: William Cory -- GitHub: roninjin10
 */



export default class DepositTransaction implements TransactionInterface {
  private deposit: AtomicTransaction
  private depositExistingChannel: AtomicTransaction
  private connext: IConnext
  private store: Store<WorkerState>
  private needsCollateral: boolean = false
  private lockStateObserver: LockStateObserver
  private sem: semaphore.Semaphore
  private chanPopulator: ChannelPopulator
  private deferredPopulate: DeferredPopulator | null
  private awaiter: Promise<void> | null = null
  private depSem: semaphore.Semaphore

  constructor (
    store: Store<WorkerState>,
    connext: IConnext,
    lockStateObserver: LockStateObserver,
    sem: semaphore.Semaphore,
    chanPopulator: ChannelPopulator
  ) {
    this.store = store
    this.connext = connext
    this.lockStateObserver = lockStateObserver
    this.sem = sem
    this.chanPopulator = chanPopulator
    this.deferredPopulate = null
    this.depSem = semaphore(1)

    this.deposit = this.makeDepositTransaction()
    this.depositExistingChannel = this.makeDepositExistingChannelTransaction()

    lockStateObserver.addUnlockHandler(this.onUnlock)
    if (!lockStateObserver.isLocked()) {
      this.restartTransaction()
    }
  }

  private makeDepositExistingChannelTransaction = () => new AtomicTransaction(
    this.store,
    'deposit:existingChannel',
    [this.doDepositExisting, this.pingChainsawBalanceChange, this.finishTransaction],
    this.afterAll,
    this.onStart,
    this.onRestart
  )

  private makeDepositTransaction = () => new AtomicTransaction(
    this.store,
    'deposit',
    [this.openChannel, this.pingChainsaw, this.requestDeposit, this.finishTransaction],
    this.afterAll,
    this.onRestart,
  )

  public startTransaction = async (amount: string): Promise<void> => {
    try {
      this.awaiter = this.deposit.start(amount)
      await this.awaiter
    } catch (e) {
      this.releaseDeferred()
      throw e
    } finally {
      this.awaiter = null
    }
  }

  public restartTransaction = async (): Promise<void> => {
    try {
      this.awaiter =
        (this.deposit.isInProgress && takeSem<void>(this.sem, () => this.deposit.restart())) ||
        (this.depositExistingChannel.isInProgress && takeSem<void>(this.sem, () => this.deposit.restart())) ||
        null

      if (!this.awaiter) {
        return
      }

      await this.awaiter
    } catch (e) {
      this.releaseDeferred()
      throw e
    } finally {
      this.awaiter = null
    }
  }

  public isInProgress = (): boolean => this.deposit.isInProgress() || this.depositExistingChannel.isInProgress()

  public setNeedsCollateral = (needsCollateral: boolean): void => {
    this.needsCollateral = needsCollateral
    this.maybeCollateralize().catch(console.error.bind(console))
  }

  public depositIntoExistingChannel = async (amount: string): Promise<void> => {
    const depositObj: Deposit = {
      ethDeposit: new BN(amount),
      tokenDeposit: null
    }

    const t = new AtomicTransaction(
      this.store,
      'deposit:existingChannel',
      [this.doDepositExisting, this.pingChainsawBalanceChange, this.finishTransaction],
      this.afterAll,
      this.onStart,
      this.onRestart
    )

    try {
      await t.start(depositObj)
    } catch (e) {
      this.releaseDeferred()
      throw e
    }
  }

  private doDepositExisting = async (depositObj: Deposit): Promise<[string]> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    const startBal = channels[0].ethBalanceA
    await this.connext.deposit(depositObj)

    return [
      startBal
    ]
  }

  private onStart = async () => {
    this.store.dispatch(actions.setHasActiveDeposit(true))
    this.deferredPopulate = await this.chanPopulator.populateDeferred()
  }

  private onRestart = this.onStart

  private afterAll = (): void => {
    this.store.dispatch(actions.setHasActiveDeposit(false))
    this.deferredPopulate = null
  }

  private openChannel = async (amount: string): Promise<any[]> => {
    const amountBn = new BN(amount)
    const depositObj: Deposit = {
      ethDeposit: amountBn,
      tokenDeposit: null
    }

    let ledgerId: string
    try {
      ledgerId = await this.connext.openChannel(depositObj) as string
    } catch(e) {
      console.error('connext.openChannel failed', e)
      throw e
    }

    return [
      amount,
      ledgerId,
      this.needsCollateral
    ]
  }

  private pingChainsaw = async (amount: string, ledgerId: string, needsCollateral: boolean): Promise<any[]> => {
    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (!res) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    }, 48)

    return [
      amount,
      ledgerId,
      needsCollateral
    ]
  }

  private pingChainsawBalanceChange = async (startAmount: string): Promise<void> => {
    const bigStartAmount = new BN(startAmount)

    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (!res || new BN(res[0].ethBalanceA).lte(bigStartAmount)) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    })
  }

  private requestDeposit = async (amount: string, ledgerId: string, needsCollateral: boolean): Promise<any[]> => {
    if (!this.needsCollateral) {
      return [
        amount,
        ledgerId,
        needsCollateral
      ]
    }

    const amountBn = new BN(amount)
    try {
      await this.connext.requestHubDeposit({
        channelId: ledgerId,
        deposit: {
          ethDeposit: amountBn
        }
      })
    } catch(e) {
      console.error('connext.requestHubDeposit failed', e)
      throw e
    }
    return []
  }

  private finishTransaction = async (): Promise<void> => {
    await this.deferredPopulate!.populate()
  }

  private maybeCollateralize = async (): Promise<void> => {
    if (!this.needsCollateral || this.lockStateObserver.isLocked()) {
      return
    }

    return takeSem<void>(this.depSem, async () => {
      if (this.awaiter) {
        await this.awaiter
      }

      const chans = await getCurrentLedgerChannels(this.connext, this.store)
      const chan = chans && chans[0]

      if (!chan || chan.ethBalanceI !== '0') {
        return
      }

      const amountBn = new BN(chan.ethBalanceA)
      await this.connext.requestHubDeposit({
        channelId: chan.channelId,
        deposit: {
          ethDeposit: amountBn
        }
      })
    })
  }

  private onUnlock = (): void => {
    this.deposit.restart()
      .then(this.maybeCollateralize)
      .catch((e) => console.error(e))
  }

  private releaseDeferred () {
    if (!this.deferredPopulate) {
      return
    }

    this.deferredPopulate.release()
    this.deferredPopulate = null
  }
}
