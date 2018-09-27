import {Store} from 'redux'
import * as semaphore from 'semaphore'
import takeSem from '../takeSem'
import * as actions from '../../worker/actions'
import {AtomicTransaction, TransactionInterface} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import withRetries from '../withRetries'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import LockStateObserver from '../LockStateObserver'
import ChannelPopulator, {DeferredPopulator} from '../ChannelPopulator'
import BN = require('bn.js')
import {IConnext, Deposit} from '../connext/ConnextTypes'
import Web3 = require('web3')
import getAddress from '../getAddress'
import Logger from '../Logger'
import {HumanStandardToken} from '../HumanStandardToken'

const tokenABI = require('human-standard-token-abi')

/**
 * The DepositTransaction handles starting new deposits as well
 * as automatically restarting new deposits.  DepositTransaction
 * hasa AtomicTransaction which allows deposits to restart should
 * a user close their browser.
 *
 * Author: William Cory -- GitHub: roninjin10
 */

export interface DepositArgs {
  ethDeposit: string,
  tokenDeposit?: string,
}

export default class DepositTransaction implements TransactionInterface {
  private deposit: AtomicTransaction<void, [DepositArgs]>
  private depositExistingChannel: AtomicTransaction<void, [DepositArgs]>
  private connext: IConnext
  private store: Store<WorkerState>
  private needsCollateral: boolean = false
  private lockStateObserver: LockStateObserver
  private sem: semaphore.Semaphore
  private chanPopulator: ChannelPopulator
  private deferredPopulate: DeferredPopulator | null
  private awaiter: Promise<void> | null = null
  private depSem: semaphore.Semaphore
  private bootyContract: HumanStandardToken
  private logger: Logger

  constructor (
    store: Store<WorkerState>,
    connext: IConnext,
    lockStateObserver: LockStateObserver,
    sem: semaphore.Semaphore,
    chanPopulator: ChannelPopulator,
    web3: Web3,
    logger: Logger,
  ) {
    this.store = store
    this.connext = connext
    this.lockStateObserver = lockStateObserver
    this.sem = sem
    this.chanPopulator = chanPopulator
    this.deferredPopulate = null
    this.depSem = semaphore(1)
    this.logger = logger

    this.bootyContract = new web3.eth.Contract(tokenABI, process.env.BOOTY_CONTRACT_ADDRESS) as HumanStandardToken

    this.deposit = this.makeDepositTransaction()
    this.depositExistingChannel = this.makeDepositExistingChannelTransaction()

    lockStateObserver.addUnlockHandler(this.onUnlock)
    if (!lockStateObserver.isLocked()) {
      this.restartTransaction()
    }
  }

  public startTransaction = async (deposit: DepositArgs): Promise<void> => {
    try {
      this.awaiter = this.deposit.start(deposit)
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
        (this.deposit.isInProgress && takeSem<void>(this.sem, () => { this.deposit.restart()})) ||
        (this.depositExistingChannel.isInProgress && takeSem<void>(this.sem, () => {this.deposit.restart()})) ||
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

  public depositIntoExistingChannel = async (deposit: DepositArgs): Promise<void> => {
    try {
      await this.depositExistingChannel.start(deposit)
    } catch (e) {
      this.releaseDeferred()
      throw e
    }
  }

  private makeDepositExistingChannelTransaction = () => new AtomicTransaction<void, [DepositArgs]>(
    this.store,
    this.logger,
    'deposit:existingChannel',
    [this.maybeErc20Approve, this.doDepositExisting, this.awaitChainsawBalanceChange, this.finishTransaction],
    this.afterAll,
    this.onStart,
    this.onRestart
  )

  private makeDepositTransaction = () => new AtomicTransaction<void, [DepositArgs]>(
    this.store,
    this.logger,
    'deposit',
    [this.maybeErc20Approve, this.openChannel, this.awaitChainsaw, this.maybeRequestDeposit, this.finishTransaction],
    this.afterAll,
    this.onRestart,
  )

  private maybeErc20Approve = async (depositObj: DepositArgs): Promise<DepositArgs> => {
    if (!depositObj.tokenDeposit || new BN(depositObj.tokenDeposit).eq(new BN(0))) {
      return {
        ...depositObj,
        tokenDeposit: undefined,
      }
    }

    await this.bootyContract
      .methods
      .approve(
        process.env.BOOTY_CONTRACT_ADDRESS as string,
        depositObj.tokenDeposit
      )
      .send({from: getAddress(this.store)})
      .catch(console.error.bind(console))


    return depositObj
  }

  private doDepositExisting = async (depositObj: DepositArgs): Promise<[string]> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    const startBal = channels[0].ethBalanceA
    await this.connext.deposit({
      ethDeposit: new BN(depositObj.ethDeposit),
      tokenDeposit: depositObj.tokenDeposit === undefined
        ? undefined
        : new BN(depositObj.tokenDeposit)
    }, undefined, undefined, process.env.BOOTY_CONTRACT_ADDRESS)

    return [startBal]
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

  private openChannel = async (amount: string): Promise<[string, string, boolean]> => {
    const amountBn = new BN(amount)
    const depositObj: Deposit = {
      ethDeposit: amountBn,
      tokenDeposit: null
    }

    let ledgerId: string
    try {
      ledgerId = await this.connext.openChannel(depositObj, process.env.BOOTY_CONTRACT_ADDRESS) as string
    } catch(e) {
      console.error('connext.openChannel failed', e)
      throw e
    }

    return [
      amount,
      ledgerId,
      this.needsCollateral,
    ]
  }

  private awaitChainsaw = async (amount: string, ledgerId: string, needsCollateral: boolean): Promise<[string, string, boolean]> => {
    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (!res) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    }, 48)

    return [
      amount,
      ledgerId,
      needsCollateral,
    ]
  }

  private awaitChainsawBalanceChange = async (startAmount: string): Promise<void> => {
    const bigStartAmount = new BN(startAmount)

    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (!res || new BN(res[0].ethBalanceA).lte(bigStartAmount)) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    }, 48)
  }

  private maybeRequestDeposit = async (amount: string, ledgerId: string, needsCollateral: boolean): Promise<[string, string, boolean]> => {
    if (!this.needsCollateral) {
      return [
        amount,
        ledgerId,
        needsCollateral,
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
    return [
      amount,
      ledgerId,
      needsCollateral,
    ]
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
