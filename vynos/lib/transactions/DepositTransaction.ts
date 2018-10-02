import {Store} from 'redux'
import * as semaphore from 'semaphore'
import takeSem from '../takeSem'
import * as actions from '../../worker/actions'
import {AtomicTransaction} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import withRetries from '../withRetries'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import ChannelPopulator, {DeferredPopulator} from '../ChannelPopulator'
import BN = require('bn.js')
import {IConnext, Deposit} from '../connext/ConnextTypes'
import Web3 = require('web3')
import getAddress from '../getAddress'
import Logger from '../Logger'
import {HumanStandardToken} from '../HumanStandardToken'
import {ICurrency} from '../currency/Currency'
import currencyAsJSON from '../currency/currencyAsJSON'
import {BOOTY, ZERO} from '../constants'

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
  ethDeposit: ICurrency,
  tokenDeposit?: ICurrency,
}

export default class DepositTransaction {
  private deposit: AtomicTransaction<void, [DepositArgs]>
  private depositExistingChannel: AtomicTransaction<void, [DepositArgs]>
  private connext: IConnext
  private store: Store<WorkerState>
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
    sem: semaphore.Semaphore,
    chanPopulator: ChannelPopulator,
    web3: Web3,
    logger: Logger,
  ) {
    this.store = store
    this.connext = connext
    this.sem = sem
    this.chanPopulator = chanPopulator
    this.deferredPopulate = null
    this.depSem = semaphore(1)
    this.logger = logger

    this.bootyContract = new web3.eth.Contract(tokenABI, process.env.BOOTY_CONTRACT_ADDRESS) as HumanStandardToken

    this.deposit = this.makeDepositTransaction()
    this.depositExistingChannel = this.makeDepositExistingChannelTransaction()
  }

  public startTransaction = async ({ethDeposit, tokenDeposit}: DepositArgs): Promise<void> => {
    if (this.awaiter) {
      throw new Error('A deposit is already in process')
    }
    try {
      this.awaiter = this.deposit.start({ethDeposit: currencyAsJSON(ethDeposit), tokenDeposit: tokenDeposit && currencyAsJSON(tokenDeposit)})
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
      if (this.deposit.isInProgress) {
        this.awaiter = takeSem<void>(this.sem, () => { this.deposit.restart()})
      } else if (this.depositExistingChannel.isInProgress) {
        this.awaiter = takeSem<void>(this.sem, () => {this.deposit.restart()})
      }

      if (this.awaiter) {
        await this.awaiter
      }

    } catch (e) {
      this.releaseDeferred()
      throw e
    } finally {
      this.awaiter = null
    }
  }

  public isInProgress = (): boolean => this.deposit.isInProgress() || this.depositExistingChannel.isInProgress()

  public depositIntoExistingChannel = async (deposit: DepositArgs): Promise<void> => {
    try {
      await this.depositExistingChannel.start(deposit)
    } catch (e) {
      this.releaseDeferred()
      throw e
    }
  }

  public maybeCollateralize = async (): Promise<void> => {
    if (!this.needsCollateral()) {
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

      await this.connext.requestHubDeposit({
        channelId: chan.channelId,
        deposit: {
          ethDeposit: new BN(chan.ethBalanceA),
          tokenDeposit: new BN(chan.tokenBalanceA),
        }
      })
    })
  }

  public changeDepositTransactionName = (name: string) => this.deposit.name = name
  private needsCollateral = () => this.store.getState().runtime.needsCollateral
  public changeDepositExistingTransactionName = (name: string) => this.depositExistingChannel.name = name

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
    console.log('maybeErc20Approve..')

    const addr = getAddress(this.store)
    const allowance = await this.bootyContract
      .methods
      .allowance(
        addr,
        process.env.BOOTY_CONTRACT_ADDRESS!
      )
      .call()
    const allowanceBn = new BN(allowance)
    console.log('allowance is', allowanceBn.toString())
    if (allowanceBn.lte(ZERO)) {
      console.log('not approved, approving.')
      await this.bootyContract
        .methods
        .approve(
          process.env.BOOTY_CONTRACT_ADDRESS!,
          new BN(BOOTY.amount).mul(new BN('10000')).toString()
        )
        .send({from: getAddress(this.store)})
      console.log('done approving')
    }

    return depositObj
  }

  private doDepositExisting = async ({tokenDeposit, ethDeposit}: DepositArgs): Promise<[string]> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)

    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    await this.connext.deposit({
      ethDeposit: new BN(ethDeposit.amount),
      tokenDeposit: tokenDeposit === undefined
        ? undefined
        : new BN(tokenDeposit.amount)
    }, undefined, undefined, process.env.BOOTY_CONTRACT_ADDRESS)

    return [channels[0].ethBalanceA]
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

  private openChannel = async ({ethDeposit, tokenDeposit}: DepositArgs): Promise<[DepositArgs, string, boolean]> => {
    console.log('opening channel')

    if (!tokenDeposit || new BN(tokenDeposit.amount).eq(new BN(0))) {
      throw new Error('cannot open a channel without a token Deposit')
    }

    const depositObj: Deposit = {
      ethDeposit: new BN(ethDeposit.amount),
      tokenDeposit: tokenDeposit && new BN(tokenDeposit.amount),
    }
    let ledgerId: string
    try {
      ledgerId = await this.connext.openChannel(depositObj, process.env.BOOTY_CONTRACT_ADDRESS) as string
    } catch(e) {
      console.error('connext.openChannel failed', {e, eth: ethDeposit.amount, tokens: tokenDeposit && tokenDeposit.amount})
      throw e
    }

    return [
      {tokenDeposit, ethDeposit},
      ledgerId,
      this.needsCollateral(),
    ]
  }

  private awaitChainsaw = async (depositArgs: DepositArgs, ledgerId: string, needsCollateral: boolean): Promise<[DepositArgs, string, boolean]> => {
    await withRetries(async () => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (!res) {
        throw new Error('Chainsaw has not caught up yet.')
      }
    }, 48)

    return [
      depositArgs,
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

  private maybeRequestDeposit = async ({ethDeposit, tokenDeposit}: DepositArgs, ledgerId: string, needsCollateral: boolean): Promise<[DepositArgs, string, boolean]> => {
    if (!this.needsCollateral()) {
      return [
        {ethDeposit, tokenDeposit},
        ledgerId,
        needsCollateral,
      ]
    }

    try {
      await this.connext.requestHubDeposit({
        channelId: ledgerId,
        deposit: {
          ethDeposit: new BN(ethDeposit.amount),
          tokenDeposit: tokenDeposit && new BN(tokenDeposit.amount),
        }
      })
    } catch(e) {
      console.error('connext.requestHubDeposit failed', e)
      throw e
    }
    return [
      {ethDeposit, tokenDeposit},
      ledgerId,
      needsCollateral,
    ]
  }

  private finishTransaction = async (): Promise<void> => {
    await this.deferredPopulate!.populate()
  }

  private releaseDeferred () {
    if (!this.deferredPopulate) {
      return
    }

    this.deferredPopulate.release()
    this.deferredPopulate = null
  }
}
