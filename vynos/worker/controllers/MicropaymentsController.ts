import VynosBuyResponse from '../../lib/VynosBuyResponse'
import {WorkerState, CurrencyType} from '../WorkerState'
import {Store} from 'redux'
import * as semaphore from 'semaphore'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import {
  BuyRequest,
  DepositRequest,
} from '../../lib/rpc/yns'
import Logger from '../../lib/Logger'
import takeSem from '../../lib/takeSem'
import DepositTransaction, { DepositArgs } from '../../lib/transactions/DepositTransaction'
import BuyTransaction from '../../lib/transactions/BuyTransaction'
import getCurrentLedgerChannels from '../../lib/connext/getCurrentLedgerChannels'
import ChannelPopulator from '../../lib/ChannelPopulator'
import {IConnext} from '../../lib/connext/ConnextTypes'
import Web3 = require('web3')
import Exchange from '../../lib/transactions/Exchange'
import { AtomicTransaction } from '../../lib/transactions/AtomicTransaction';
import CloseChannelTransaction from '../../lib/transactions/CloseChannelTransaction';
import {VynosPurchase} from '../../lib/VynosPurchase'
import * as actions from '../actions'
import getChannels from '../../lib/connext/getChannels';

export default class MicropaymentsController extends AbstractController {
  store: Store<WorkerState>

  timeout: any

  private sem: semaphore.Semaphore
  private connext: IConnext
  private depositTransaction: DepositTransaction
  private buyTransaction: BuyTransaction
  private withdrawTransaction: AtomicTransaction<void>
  private exchange: Exchange

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, chanPopulator: ChannelPopulator, web3: Web3) {
    super(logger)
    this.store = store
    this.sem = semaphore(1)
    this.connext = connext

    this.exchange = new Exchange(store, logger, connext)

    this.depositTransaction = new DepositTransaction(store, connext, this.sem, chanPopulator, web3, logger)
    this.buyTransaction = new BuyTransaction(store, logger, connext, this.sem)

    const closeChannel = async () => {
      const cct = new CloseChannelTransaction(store, logger, connext, this.sem, chanPopulator)
      await cct.execute()
    }

    const exchangeForEth = async () => {
      if (!this.bootySupport()) {
        return
      }
      if (this.exchange.isInProgress()) {
        return await this.exchange.restartSwap()
      }
      return await this.exchange.swapBootyForEth()
    }

    this.withdrawTransaction =  new AtomicTransaction(
      store,
      logger,
      'exchange-then-close',
      [exchangeForEth, closeChannel]
    )
  }

  async start (): Promise<void> {
    this.store.dispatch(actions.setChannel(
      await getChannels(this.connext, this.store)
    ))

    await this.depositTransaction.maybeCollateralize()

    if (this.exchange.isInProgress()) {
      await this.exchange.restartSwap()
    }

    if (this.depositTransaction.isInProgress()) {
      await this.depositTransaction.restartTransaction()
      await this.exchange.swapEthForBooty()
    }

    if (this.withdrawTransaction.isInProgress()) {
      await this.withdrawTransaction.restart()
    }

    if (this.buyTransaction.isInProgress()) {
      await this.buyTransaction.restartTransaction()
    }
  }

  public async deposit (deposit: DepositArgs): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot deposit. Another operation is in progress.')
    }

    await takeSem<void>(this.sem, async () => {
      await this.doDeposit(deposit)

      if (this.bootySupport()) {
        await this.exchange.swapEthForBooty()
      }
    })
  }

  public async buy (purchase: VynosPurchase<CurrencyType.BOOTY>): Promise<VynosBuyResponse> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot tip. Another operation is in progress.')
    }

    return await takeSem<VynosBuyResponse>(this.sem, () => {
      this.logToApi('doBuy', purchase)
      return this.buyTransaction.startTransaction(purchase)
    })
  }

  public async closeChannel (): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot close channels.  Another operation is in progress.')
    }

    await takeSem<void>(this.sem, () => {
      this.logToApi('doCloseChannel', {})
      return this.withdrawTransaction.start()
    })
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, DepositRequest.method, this.deposit)
    this.registerHandler(server, BuyRequest.method, this.buy)
  }

  private async doDeposit (deposit: DepositArgs): Promise<void> {
    this.logToApi('doDeposit', {deposit})

    const existingChannel = await getCurrentLedgerChannels(this.connext, this.store)
    existingChannel
      ? await this.depositTransaction.depositIntoExistingChannel(deposit)
      : await this.depositTransaction.startTransaction(deposit)
  }

  private bootySupport = () => this.store.getState().runtime.featureFlags.bootySupport
}
