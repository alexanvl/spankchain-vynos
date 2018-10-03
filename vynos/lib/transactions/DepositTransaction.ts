import {Store} from 'redux'
import * as semaphore from 'semaphore'
import takeSem from '../takeSem'
import * as actions from '../../worker/actions'
import {AtomicTransaction} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import withRetries, {DoneFunc} from '../withRetries'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import ChannelPopulator, {DeferredPopulator} from '../ChannelPopulator'
import BN = require('bn.js')
import {IConnext, Deposit, LedgerChannel} from '../connext/ConnextTypes'
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

function valMap(obj: any, f: any): any {
  let res: any = {}
  Object.keys(obj).forEach(k => {
    res[k] = f(obj[k])
  })
  return res
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
      console.log("START:")
      this.awaiter = this.deposit.start({ethDeposit: currencyAsJSON(ethDeposit), tokenDeposit: tokenDeposit && currencyAsJSON(tokenDeposit)})
      console.log("B")
      await this.awaiter
      console.log("C")
    } catch (e) {
      this.releaseDeferred()
      console.log("E:", e)
      throw e
    } finally {
      console.log("D")
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

      if (!chan) {
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
    [this.maybeErc20Approve, this.doEthDeposit, this.doTokenDeposit,this.awaitChainsawBalanceChange, this.finishTransaction],
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
    const addr = getAddress(this.store)
    const balance = await this.bootyContract
      .methods
      .balanceOf(addr)
      .call()

    console.log('Token balance:', balance.toString())

    const allowance = await this.bootyContract
      .methods
      .allowance(
        addr,
        process.env.CONTRACT_ADDRESS!
      )
      .call()
    const allowanceBn = new BN(allowance)
    const min = new BN(BOOTY.amount).mul(new BN('10000'))
    if (allowanceBn.lte(min)) {
      await this.bootyContract
        .methods
        .approve(
          process.env.CONTRACT_ADDRESS!,
          min.toString()
        )
        .send({
          from: getAddress(this.store),
          gas: 4000000
        })
        .on('error', function(error){ console.error('ERROR:', error) })
        .on('transactionHash', function(transactionHash){ console.log('TXHASH:',transactionHash) })
        .on('receipt', function(receipt){
           console.log('RECEIPT:', receipt.contractAddress) // contains the new contract address
        })
    }

    return depositObj
  }

  // we must do eth adn token deposits in seperate contract calls/connext client calls
  private doEthDeposit = async ({tokenDeposit, ethDeposit}: DepositArgs): Promise<[DepositArgs, LedgerChannel]> => {
    console.log('doEthDeposit', tokenDeposit && tokenDeposit.toString(), ethDeposit && ethDeposit.toString())
    const startingLc = await this.connext.getChannelByPartyA()

    if (ethDeposit.amount !== '0') {
      await this.doDepositExisting({ethDeposit})
    }
    return [{tokenDeposit, ethDeposit}, startingLc]
  }

  private doTokenDeposit = async ({tokenDeposit, ethDeposit}: DepositArgs, startingLc: LedgerChannel): Promise<[DepositArgs, LedgerChannel]> => {
    console.log('doTokenDeposit')
    if (tokenDeposit && tokenDeposit.amount !== '0') {
      await this.doDepositExisting({tokenDeposit})
    }
    return [{tokenDeposit, ethDeposit}, startingLc]
  }

  private doDepositExisting = async ({tokenDeposit, ethDeposit}: {tokenDeposit?: ICurrency, ethDeposit?: ICurrency}): Promise<[LedgerChannel]> => {
    console.log('doDepositExisting', tokenDeposit, ethDeposit)
    const channels = await getCurrentLedgerChannels(this.connext, this.store)

    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    await this.connext.deposit({
      ethDeposit: ethDeposit && new BN(ethDeposit.amount),
      tokenDeposit: tokenDeposit === undefined
        ? undefined
        : new BN(tokenDeposit.amount)
    } as any, undefined, undefined, process.env.BOOTY_CONTRACT_ADDRESS)

    return [channels[0]]
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
      console.log('attempting deposit with', valMap(depositObj, (x: any) => x && x.toString()))
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
    await withRetries(async (done: DoneFunc) => {
      const res = await getCurrentLedgerChannels(this.connext, this.store)

      if (res) {
        done()
      }
    }, 48)

    return [
      depositArgs,
      ledgerId,
      needsCollateral,
    ]
  }

  private awaitChainsawBalanceChange = async ({ethDeposit, tokenDeposit}: DepositArgs, startingLc: LedgerChannel): Promise<void> => {
    let waitingForTokens = tokenDeposit && tokenDeposit.amount !== '0'
    let waitingForEth = ethDeposit && ethDeposit.amount !== '0'

    await withRetries(async (done: DoneFunc) => {
      const res = await this.connext.getChannelByPartyA()

      if (res && new BN(res.ethBalanceA).gt(new BN(startingLc.ethBalanceA))) {
        waitingForEth = false
      }

      if (res && new BN(res.tokenBalanceA).gt(new BN(startingLc.tokenBalanceA))) {
        waitingForTokens = false
      }

      if (!waitingForTokens && !waitingForEth) {
        done()
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
