import {BigNumber} from 'bignumber.js'
import {
  PaymentChannel, PaymentChannelJSON, PaymentChannelSerde,
  SerializedPaymentChannel
} from 'machinomy/dist/lib/payment_channel'
import VynosBuyResponse from '../../lib/VynosBuyResponse'
import ChannelClaimStatusResponse, {
  ChannelClaimStatus,
  CLOSE_CHANNEL_ERRORS
} from '../../lib/ChannelClaimStatusResponse'
import Machinomy from 'machinomy'
import SharedStateView from '../SharedStateView'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import {
  BuyRequest,
  CloseChannelsForCurrentHubRequest,
  DepositRequest,
  ListChannelsRequest,
  PopulateChannelsRequest,
  RecoverChannelRequest
} from '../../lib/rpc/yns'
import AbstractController from './AbstractController'
import requestJson, {request} from '../../frame/lib/request'
import ChannelId from 'machinomy/dist/lib/ChannelId'
import * as semaphore from 'semaphore'
import wait from '../../lib/wait'
import Web3 = require('web3')
import Logger from '../../lib/Logger';
import {logMetricWorker} from '../../lib/metrics'

export default class MicropaymentsController extends AbstractController {
  store: Store<WorkerState>

  sharedStateView: SharedStateView

  machinomy: Machinomy

  web3: Web3

  timeout: any

  claimStatusTimeout: any

  lastAddress: string

  private sem: semaphore.Semaphore

  private server: JsonRpcServer

  constructor (web3: Web3, store: Store<WorkerState>, sharedStateView: SharedStateView, server: JsonRpcServer) {
    super(new Logger('MicropaymentsController', sharedStateView))
    this.web3 = web3
    this.store = store
    this.sharedStateView = sharedStateView
    this.sem = semaphore(1)
    this.server = server
    this.startScanningPendingChannelIds = this.startScanningPendingChannelIds.bind(this)
    this.startScanningPendingChannelIds()
  }

  public async populateChannels (): Promise<void> {
    return this.takeSem<void>(() => this.doPopulateChannels())
  }

  public async closeChannelsForCurrentHub (): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot withdraw. Another operation is in progress.')
    }

    return this.takeSem<void>(() => this.doCloseChannelsForCurrentHub())
  }

  public async deposit (amount: string): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot deposit. Another operation is in progress.')
    }

    return this.takeSem<void>(() => this.doDeposit(amount))
  }

  public async buy (price: number, meta: any): Promise<VynosBuyResponse> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot tip. Another operation is in progress.')
    }

    return this.takeSem<VynosBuyResponse>(() => this.doBuy(price, meta))
  }

  public async recoverChannel(channelId: string): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot recover. Another operation is in progress.')
    }

    return this.takeSem<void>(() => this.doRecover(channelId))
  }

  public async listChannels (): Promise<PaymentChannel[]> {
    const machinomy = await this.getMachinomy()
    return machinomy.channels()
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, PopulateChannelsRequest.method, this.populateChannels)
    this.registerHandler(server, CloseChannelsForCurrentHubRequest.method, this.closeChannelsForCurrentHub)
    this.registerHandler(server, DepositRequest.method, this.deposit)
    this.registerHandler(server, ListChannelsRequest.method, this.listChannels)
    this.registerHandler(server, BuyRequest.method, this.buy)
    this.registerHandler(server, RecoverChannelRequest.method, this.recoverChannel)
  }

  private async getMachinomy (): Promise<Machinomy> {
    const accounts = await this.sharedStateView.getAccounts()
    const address = accounts[0]

    if (this.machinomy && this.lastAddress === address) {
      return this.machinomy
    }

    this.machinomy = new Machinomy(address, this.web3, {
      databaseUrl: `nedb://vynos-${address}`,
      settlementPeriod: Number.MAX_SAFE_INTEGER,
      closeOnInvalidPayment: false
    })

    this.lastAddress = address

    return this.machinomy
  }

  private async checkThenCloseChannel (hubUrl: string, channelId: string): Promise<void> {
    const claimStatus = await this.getChannelClaimStatus(channelId)
    const {status} = claimStatus

    switch (status) {
      case ChannelClaimStatus.FAILED:
      case null:
        await this.closeChannel(hubUrl, channelId)
        await this.pollChannelClaimStatus(channelId)
      case ChannelClaimStatus.NEW:
      case ChannelClaimStatus.PENDING:
        this.store.dispatch(actions.setActiveWithdrawalError(CLOSE_CHANNEL_ERRORS.ALREADY_IN_PROGRESS))
        await this.pollChannelClaimStatus(channelId)
      case ChannelClaimStatus.CONFIRMED:
        return
      default:
        throw Error(CLOSE_CHANNEL_ERRORS.UNKNOWN_STATUS)
    }
  }

  private async pollChannelClaimStatus (channelId: string): Promise<any> {
    const maxAttempts = 200

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const claimStatus = await this.getChannelClaimStatus(channelId)
      const machinomy = await this.getMachinomy()
      const channel = await machinomy.channelById(channelId)
      const {status} = claimStatus

      if (channel && channel.state === ChannelClaimStatus.CONVERGED) {
        logMetricWorker(this.server, 'channelClaimStatusConvergenceAttempts', {
          count: attempt,
          channelId
        })

        if (status === ChannelClaimStatus.CONFIRMED) {
          this.store.dispatch(actions.setActiveWithdrawalError(null))
          await this.syncMachinomyRedux()
          this.store.dispatch(actions.setHasActiveWithdrawal(false))
          return claimStatus
        } else if (status === ChannelClaimStatus.FAILED) {
          this.store.dispatch(actions.setHasActiveWithdrawal(false))
          this.store.dispatch(actions.setActiveWithdrawalError(CLOSE_CHANNEL_ERRORS.FAILED))
          throw new Error(CLOSE_CHANNEL_ERRORS.FAILED)
        }
      }

      await wait(250)
    }

    this.store.dispatch(actions.setHasActiveWithdrawal(false))
    this.store.dispatch(actions.setActiveWithdrawalError(CLOSE_CHANNEL_ERRORS.CONVERGENCE_FAILED))
    throw new Error(CLOSE_CHANNEL_ERRORS.CONVERGENCE_FAILED)
  }

  private async closeChannel (hubUrl: string, channelId: string): Promise<void> {
    await request(`${hubUrl}/channels/${channelId}/close`, {
      method: 'POST',
      credentials: 'include'
    })
  }

  private async initChannel (isRecovery: boolean = false) {
    const name = isRecovery ? 'Channel Recovery Probe' : 'Channel Open/Deposit Probe'

    /**
     * This is needed because the smart contracts requires a payment to be provided to the claim
     * method. Clicking withdraw uses the 'claim' method on the hub since claiming is instant.
     */
    await this.doBuy(0, {
      type: 'TIP',
      fields: {
        streamId: 'probe',
        streamName: name,
        performerId: 'probe',
        performerName: name,
      },
      receiver: '0x0000000000000000000000000000000000000000'
    })

    await this.syncMachinomyRedux()
  }

  private async getChannelsByPublicKey (): Promise<string[]> {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const accounts = await this.sharedStateView.getAccounts()
    const address = accounts[0]

    const res = await requestJson(`${hubUrl}/accounts/${address}/channelIds`, {
      method: 'GET',
      credentials: 'include'
    })

    return res as string[]
  }

  private async getChannelClaimStatus (channelId: string): Promise<ChannelClaimStatusResponse> {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const res = await requestJson(`${hubUrl}/channels/${channelId}/claimStatus`, {
      method: 'GET',
      credentials: 'include'
    })

    return res as ChannelClaimStatusResponse
  }

  private async doCloseChannelsForCurrentHub (): Promise<void> {
    try {
      const sharedState = await this.sharedStateView.getSharedState()
      const hubUrl = await this.sharedStateView.getHubUrl()

      const channels = sharedState.channels[hubUrl]

      if (!channels || !channels.length) {
        return
      }

      this.store.dispatch(actions.setHasActiveWithdrawal(true))
      await Promise.all(channels.map((ch: SerializedPaymentChannel) => this.checkThenCloseChannel(hubUrl, ch.channelId)))
    } catch (error) {
      if (error.message !== CLOSE_CHANNEL_ERRORS.ALREADY_IN_PROGRESS) {
        this.store.dispatch(actions.setHasActiveWithdrawal(false))
      }

      throw error
    }
  }

  private async doDeposit (amount: string): Promise<void> {
    const sharedState = await this.sharedStateView.getSharedState()
    const hubUrl = await this.sharedStateView.getHubUrl()
    const machinomy = await this.getMachinomy()
    const channels = sharedState.channels[hubUrl]
    const bigAmount = new BigNumber(amount)

    if (channels && channels.length) {
      await machinomy.deposit(channels[0].channelId, bigAmount)
      await this.syncMachinomyRedux()
    } else {
      const receiver = sharedState.branding.address
      // need to use fromascii here since machinomy stores the version of the
      // channel that goes over the wire to the contract (i.e., converted to hex
      // from ascii
      const channelId = this.web3.fromAscii(ChannelId.random().id.toString('hex'))
      this.store.dispatch(actions.openChannel(channelId))

      if (!this.timeout) {
        this.startScanningPendingChannelIds()
      }

      try {
        await this.openChannel(receiver, bigAmount, channelId)
        await this.initChannel()
      } catch (e) {
        console.error('Failed to open channel:', e)
        throw e
      } finally {
        // Remove channelId from watchers
        this.store.dispatch(actions.removePendingChannel(channelId))
      }
    }
  }

  private async doPopulateChannels (): Promise<void> {
    const machinomy = await this.getMachinomy()
    let channels = await machinomy.channels()

    if (!channels.length) {
      channels = await this.fetchChannelsFromHub()
    }

    await Promise.all(channels.map(async (chan: PaymentChannel) => await this.syncPaymentsForChannel(chan.channelId)))
    await this.syncMachinomyRedux()
  }

  private async doBuy (price: number, meta: any): Promise<VynosBuyResponse> {
    const sharedState = await this.sharedStateView.getState()

    if (sharedState.runtime.hasActiveWithdrawal) {
      throw new Error('Can\'t tip while a withdrawal is active.')
    }

    const receiver = (await this.sharedStateView.getSharedState()).branding.address
    const hubUrl = await this.sharedStateView.getHubUrl()
    const machinomy = await this.getMachinomy()
    const channels = await machinomy.channels()

    // machinomy performs the below two checks internally, however
    // it will open a channel automatically if no suitable existing
    // channels are found. the wallet needs user interaction to fill it,
    // so we throw errors if there is no open channel or the channel does
    // not have sufficient funds.
    if (!channels.length) {
      throw new Error('A channel must be open.')
    }

    const chan = channels[0]

    if (chan.spent.add(price).gt(chan.value)) {
      throw new Error('Insufficient funds.')
    }

    const res = await machinomy.buy({
      gateway: `${hubUrl}/payments`,
      receiver,
      price,
      meta: '',
      purchaseMeta: meta
    })

    await this.syncMachinomyRedux()

    return {
      channelId: res.channelId,
      token: res.token
    }
  }

  private async doRecover(channelId: string): Promise<void> {
    const machinomy = await this.getMachinomy()
    const channels = await machinomy.channels()
    const hasChannel = channels.find((chan: PaymentChannel) => chan.channelId === channelId)

    if (hasChannel) {
      throw new Error('This channel does not need to be recovered. Please withdraw this channel ' +
        'using the SpankCard UI.')
    }

    try {
      await this.doCloseChannelsForCurrentHub()
    } catch (e) {
      throw new Error(`Failed to close existing channel: ${e.message}`)
    }

    const chan = await machinomy.channelById(channelId)

    if (!chan) {
      throw new Error(`Channel not found or not recoverable.`)
    }

    try {
      await this.initChannel(true)
    } catch (e) {
      throw new Error(`Failed to initialize channel: ${e.message}`)
    }

    try {
      await this.doCloseChannelsForCurrentHub()
    } catch (e) {
      throw new Error(`Failed to close recovering channel: ${e.message}`)
    }

    try {
      await this.syncMachinomyRedux()
    } catch (e) {
      throw new Error(`Failed to resync after closing recovered channel. ${e.message}`)
    }
  }

  private async startScanningPendingChannelIds (): Promise<void> {
    if (!this.sem.available(1)) {
      this.timeout = setTimeout(this.startScanningPendingChannelIds, 1000)
      return
    }

    try {
      await this.takeSem<void>(() => this.doScanPendingChannelIds())
    } catch (e) {
      console.error(e)
    }
  }

  private async doScanPendingChannelIds () {
    this.timeout = null
    const machinomy = await this.getMachinomy()
    const state = this.store.getState()
    const {pendingChannelIds, didInit} = state.persistent
    const isLocked = !state.runtime.wallet

    if (!pendingChannelIds || !pendingChannelIds.length) {
      return
    }

    const promises = pendingChannelIds.map(async (channelId) => {
      if (isLocked || !didInit) {
        return
      }

      const paymentChannel = await machinomy.channelById(channelId)

      if (paymentChannel) {
        // Initialize channel with a 0 tip
        await this.initChannel()
        // Remove channelId from watchers
        this.store.dispatch(actions.removePendingChannel(channelId))
      }
    })

    await Promise.all(promises)
    this.timeout = setTimeout(this.startScanningPendingChannelIds, 15000)
  }

  private async syncMachinomyRedux () {
    const machinomy = await this.getMachinomy()
    const channels = await machinomy.channels()

    this.store.dispatch(actions.setChannels(channels.map(
      (ch: PaymentChannel) => PaymentChannelSerde.instance.serialize(ch))))
  }

  private async syncPaymentsForChannel (channelId: string) {
    const machinomy = await this.getMachinomy()
    const receiver = (await this.sharedStateView.getSharedState()).branding.address
    const localChan = await machinomy.channelById(channelId)

    if (!localChan) {
      throw new Error('No local channel found.')
    }

    const remoteChan = PaymentChannelSerde.instance.deserialize(await this.pollForRemoteChannel(channelId))

    if (localChan.spent.equals(remoteChan.spent)) {
      return
    }

    const diff = remoteChan.spent.minus(localChan.spent)

    if (diff.lessThan(0)) {
      throw new Error('Channel value cannot be negative.')
    }

    if (localChan.spent.plus(diff).greaterThan(remoteChan.value)) {
      throw new Error('Insufficient funds remaining in channel.')
    }

    await machinomy.payment({
      receiver,
      price: diff
    })
  }

  private async fetchChannelsFromHub (): Promise<PaymentChannel[]> {
    const machinomy = await this.getMachinomy()
    const channelIds = await this.getChannelsByPublicKey()
    const chans = []

    for (let i = 0; i < channelIds.length; i++) {
      const chan = await machinomy.channelById(channelIds[i])

      if (!chan) {
        throw new Error('Channel on hub not found.')
      }

      chans.push(chan)
    }

    return chans
  }

  /**
   * Opens a channel. Does quite a bit of polling. Here's why:
   *
   * 1. truffle-contract has a hardcoded time limit of 4 minutes. When Infura has to handle
   * a large number of pending transactions, it can take longer than that for a transaction
   * to be broadcast to the blockchain. Thus, Truffle will throw an exception when the
   * transaction actually succeeded, which can lead to locked up funds.
   *
   * We get around this buy polling for the channel's state for up to six minutes after
   * truffle-contract throws a timed-out exception.
   *
   * 2. Different contract calls can be cached and thus return different values. To make
   * sure that the channel's value is what we expect it to be, we poll the channelById
   * method to make sure.
   *
   * @param {string} receiver
   * @param {BigNumber} amount
   * @param {string} channelId
   * @returns {Promise<PaymentChannel>}
   */
  private async openChannel (receiver: string, amount: BigNumber, channelId: string): Promise<PaymentChannel> {
    const machinomy = await this.getMachinomy()

    let chan: PaymentChannel

    // try to open channel
    try {
      chan = await machinomy.open(receiver, amount, channelId)
    } catch (err) {
      if (!err.message.match(/wasn't processed in \d+ seconds/i)) {
        throw err
      }

      // poll if it times out
      chan = await this.pollForOpenChannel(channelId)
    }

    let maxAttempts = 240

    // ensure that the channel exists in the channels array
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const chans = await machinomy.channels()
      const chanExists = chans.find((c: PaymentChannel) => c.channelId === channelId)

      if (chanExists) {
        logMetricWorker(this.server, 'machinomyTxReceiptConvergenceAttempts', {
          count: attempt,
          channelId
        })
        return chan
      }

      await wait(250)
    }

    throw new Error('Transaction receipt and contract failed to converge.')
  }

  /**
   * Performs polling for the opening channel's status after Truffle
   * throws its timeout error.
   *
   * @param {string} channelId
   * @returns {Promise<PaymentChannel>}
   */
  private async pollForOpenChannel (channelId: string): Promise<PaymentChannel> {
    const machinomy = await this.getMachinomy()
    let maxAttempts = 72

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const chan = await machinomy.channelById(channelId)

      if (chan) {
        logMetricWorker(this.server, 'backupPollAttempts', {
          count: attempt,
          channelId
        })

        return chan
      }

      await wait(5000)
    }

    throw new Error('Opening channel timed out.')
  }

  private async pollForRemoteChannel(channelId: string): Promise<any> {
    const hubUrl = await this.sharedStateView.getHubUrl()

    let maxAttempts = 15

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const chan = await requestJson<any>(`${hubUrl}/channels/${channelId}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (chan && chan.channelId) {
        logMetricWorker(this.server, 'chainsawContractConvergenceAttempts', {
          count: attempt,
          channelId
        })
        return chan
      }

      await wait(1000)
    }

    throw new Error('Chainsaw and contract failed to converge.')
  }

  private takeSem<T> (fn: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => this.sem.take(async () => {
      let isFailed = false
      let res: any

      try {
        res = fn()

        if (res.then) {
          res = await res
        }
      } catch (e) {
        res = e
        isFailed = true
      }

      this.sem.leave()

      if (isFailed) {
        return reject(res)
      }

      resolve(res)
    }))
  }
}
