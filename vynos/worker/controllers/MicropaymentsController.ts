import VynosBuyResponse from '../../lib/VynosBuyResponse'
import {WorkerState, CurrencyType} from '../WorkerState'
import {Store} from 'redux'
import * as semaphore from 'semaphore'
import AbstractController from './AbstractController'
import * as actions from '../actions'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import {
  BuyRequest,
  CloseLedgerChannels,
  DepositRequest,
  SetIsPendingVerificationRequest,
  SetNeedsCollateralRequest
} from '../../lib/rpc/yns'
import Logger from '../../lib/Logger'
import takeSem from '../../lib/takeSem'
import DepositTransaction from '../../lib/DepositTransaction'
import CloseChannelTransaction from '../../lib/CloseChannelTransaction'
import BuyTransaction from '../../lib/BuyTransaction'
import getCurrentLedgerChannels from '../../lib/connext/getCurrentLedgerChannels'
import LockStateObserver from '../../lib/LockStateObserver'
import ChannelPopulator from '../../lib/ChannelPopulator'
import Currency from '../../lib/Currency'
import {IConnext} from '../../lib/connext/ConnextTypes'

export default class MicropaymentsController extends AbstractController {
  store: Store<WorkerState>

  timeout: any

  private sem: semaphore.Semaphore
  private connext: IConnext
  private depositTransaction: DepositTransaction
  private closeChannelTransaction: CloseChannelTransaction
  private buyTransaction: BuyTransaction
  private chanPopulator: ChannelPopulator

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, lockStateObserver: LockStateObserver, chanPopulator: ChannelPopulator) {
    super(logger)
    this.store = store
    this.sem = semaphore(1)
    this.connext = connext
    this.chanPopulator = chanPopulator

    this.depositTransaction = new DepositTransaction(store, connext, lockStateObserver, this.sem, chanPopulator)
    this.closeChannelTransaction = new CloseChannelTransaction(store, connext, lockStateObserver, this.sem, chanPopulator)
    this.buyTransaction = new BuyTransaction(store, connext, lockStateObserver, this.sem)
    this.depositTransaction.restartTransaction()
    this.closeChannelTransaction.restartTransaction()
    this.buyTransaction.restartTransaction()
  }

  public async closeLedgerChannels (): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot withdraw. Another operation is in progress.')
    }

    return takeSem<void>(this.sem, () => this.doCloseLedgerChannels())
  }

  public async deposit (amount: string): Promise<void> {
    if (!this.sem.available(1)) {
      throw new Error('Cannot deposit. Another operation is in progress.')
    }
    return takeSem<void>(this.sem, () => this.doDeposit(amount))
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
    this.registerHandler(server, CloseLedgerChannels.method, this.closeLedgerChannels)
    this.registerHandler(server, DepositRequest.method, this.deposit)
    this.registerHandler(server, BuyRequest.method, this.buy)
    this.registerHandler(server, SetNeedsCollateralRequest.method, this.setNeedsCollateral)
    this.registerHandler(server, SetIsPendingVerificationRequest.method, this.setIsPendingVerification)
  }

  private async doCloseLedgerChannels (): Promise<void> {
    this.logToApi('doCloseLedgerChannels', {})
    this.closeChannelTransaction.startTransaction()
  }

  private async doDeposit (amount: string): Promise<void> {
    this.logToApi('doDeposit', {amount})

    const existingChannel = await getCurrentLedgerChannels(this.connext, this.store)
    existingChannel
      ? await this.depositTransaction.depositIntoExistingChannel(amount)
      : await this.depositTransaction.startTransaction(amount)
  }
}
