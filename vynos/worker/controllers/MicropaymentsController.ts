import VynosBuyResponse from '../../lib/VynosBuyResponse'
import {WorkerState, CurrencyType} from '../WorkerState'
import {Store} from 'redux'
import * as semaphore from 'semaphore'
import AbstractController from './AbstractController'
import * as actions from '../actions'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import {
  BuyRequest,
  DepositRequest,
  SetIsPendingVerificationRequest,
  SetNeedsCollateralRequest
} from '../../lib/rpc/yns'
import Logger from '../../lib/Logger'
import takeSem from '../../lib/takeSem'
import DepositTransaction, { DepositArgs } from '../../lib/transactions/DepositTransaction'
import BuyTransaction from '../../lib/transactions/BuyTransaction'
import getCurrentLedgerChannels from '../../lib/connext/getCurrentLedgerChannels'
import LockStateObserver from '../../lib/LockStateObserver'
import ChannelPopulator from '../../lib/ChannelPopulator'
import Currency from '../../lib/currency/Currency'
import {IConnext} from '../../lib/connext/ConnextTypes'
import Web3 = require('web3')

export default class MicropaymentsController extends AbstractController {
  store: Store<WorkerState>

  timeout: any

  private sem: semaphore.Semaphore
  private connext: IConnext
  private depositTransaction: DepositTransaction
  private buyTransaction: BuyTransaction

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, lockStateObserver: LockStateObserver, chanPopulator: ChannelPopulator, web3: Web3) {
    super(logger)
    this.store = store
    this.sem = semaphore(1)
    this.connext = connext

    this.depositTransaction = new DepositTransaction(store, connext, lockStateObserver, this.sem, chanPopulator, web3, logger)
    this.buyTransaction = new BuyTransaction(store, logger, connext, lockStateObserver, this.sem)
    this.depositTransaction.restartTransaction()
    this.buyTransaction.restartTransaction()
  }

  public async deposit (deposit: DepositArgs): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot deposit. Another operation is in progress.')
    }
    return takeSem<void>(this.sem, () => this.doDeposit(deposit))
  }

  public async buy (priceStrWEI: string, meta: any): Promise<VynosBuyResponse> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot tip. Another operation is in progress.')
    }
    const priceWEI = new Currency(CurrencyType.WEI, priceStrWEI)
    return takeSem<VynosBuyResponse>(this.sem, () => {
      this.logToApi('doBuy', {
        priceStrWEI,
        meta
      })
      return this.buyTransaction.startTransaction(priceWEI, meta)
    })
  }

  private async setNeedsCollateral (needsCollateral: boolean): Promise<void> {
    this.depositTransaction.setNeedsCollateral(needsCollateral)
  }

  private setIsPendingVerification (isPendingVerification: boolean): void {
    actions.setIsPendingVerification(isPendingVerification)
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, DepositRequest.method, this.deposit)
    this.registerHandler(server, BuyRequest.method, this.buy)
    this.registerHandler(server, SetNeedsCollateralRequest.method, this.setNeedsCollateral)
    this.registerHandler(server, SetIsPendingVerificationRequest.method, this.setIsPendingVerification)
  }

  private async doDeposit (deposit: DepositArgs): Promise<void> {
    this.logToApi('doDeposit', {deposit})

    const existingChannel = await getCurrentLedgerChannels(this.connext, this.store)
    existingChannel
      ? await this.depositTransaction.depositIntoExistingChannel(deposit)
      : await this.depositTransaction.startTransaction(deposit)
  }
}
