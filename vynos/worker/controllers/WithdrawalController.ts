import {Store} from 'redux'
import BN = require('bn.js')
import AbstractController from './AbstractController'
import {aggregateVCBalancesWEI} from '../../lib/aggregateVCBalances'
import ChannelPopulator from '../../lib/ChannelPopulator'
import {closeAllVCs} from '../../lib/connext/closeAllVCs'
import {
  IConnext,
  PurchaseMetaType,
  ChannelType,
  LedgerChannel,
} from '../../lib/connext/ConnextTypes'
import getAddress from '../../lib/getAddress'
import getVirtualChannels from '../../lib/getVirtualChannels'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'
import {SendRequest, SendEntireBalanceRequest} from '../../lib/rpc/yns'
import {WorkerState, CurrencyType} from '../WorkerState'
import CurrencyConvertable from '../../lib/currency/CurrencyConvertable'
import {math} from '../../math'
import {buySellBooty} from '../../lib/transactions/BuyBootyTransaction'
import {AtomicTransaction} from '../../lib/transactions/AtomicTransaction'
import CloseChannelTransaction from '../../lib/transactions/CloseChannelTransaction'
import * as semaphore from 'semaphore'
import OpenChannelMigration from '../../migrations/OpenChannelMigration'
import DepositTransaction from '../../lib/transactions/DepositTransaction'
import Web3 = require('web3')

export default class WithdrawalController extends AbstractController {
  private store: Store<WorkerState>
  private connext: IConnext
  private populator: ChannelPopulator
  private closeAndReopenTx: AtomicTransaction<void, [string]>
  private closeChannelTx: CloseChannelTransaction
  private openChannelTx: OpenChannelMigration

  constructor (
    logger: Logger, 
    connext: IConnext, 
    store: Store<WorkerState>, 
    populator: ChannelPopulator, 
    sem: semaphore.Semaphore, 
    web3: Web3
  ) {
    super(logger)
    this.store = store
    this.connext = connext
    this.populator = populator
    
    this.closeAndReopenTx = new AtomicTransaction(this.store, logger, 'withdrawal', [this._sendEntireBalance, this.closeChannel, this.openChannel]) 
    this.closeChannelTx = new CloseChannelTransaction(store, logger, connext, sem, populator)

    const depositTx = new DepositTransaction(store, connext, sem, populator, web3, logger)
    this.openChannelTx = new OpenChannelMigration(logger, 'placeholder', 'placeholder', depositTx, web3, connext)

    if (this.closeAndReopenTx.isInProgress()) {
      this.closeAndReopenTx.restart()
    }
  }

  async start (): Promise<void> {
    //noop
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, SendRequest.method, this.send)
    this.registerHandler(server, SendEntireBalanceRequest.method, this.sendEntireBalance)
  }

  public sendEntireBalance = async (to: string) : Promise<void> => {
    await this.closeAndReopenTx.start(to)
  }

  public _sendEntireBalance = async (to: string): Promise<void> => {
    await closeAllVCs(this.store, this.connext)
    // 1. Swap all booty for ETH
    // 2. Call `send` with complete balance

    let lc: LedgerChannel = await this.connext.getChannelByPartyA()
    if (math.gt(lc.tokenBalanceA, 0)) {  // this should always
      const bootyToSell = new CurrencyConvertable(
        CurrencyType.BEI,
        math.mul(lc.tokenBalanceA, -1).add(new BN(1)),
        () => this.store.getState().runtime.exchangeRates!,
      )
      await buySellBooty(this.connext, lc, bootyToSell)
      lc = await this.connext.getChannelByPartyA()
    }

    const lcBalanceWei = math.bn(lc.ethBalanceA)
    const vcs = await getVirtualChannels(lc.channelId)
    const vcBalancesWei = await aggregateVCBalancesWEI(
      getAddress(this.store),
      vcs
    ).amountBN
    const totalBalanceWei = lcBalanceWei.add(vcBalancesWei)

    await this.send(to, totalBalanceWei.toString())
  }

  public send = async (to: string, valueWei: string): Promise<void> => {
    await closeAllVCs(this.store, this.connext)
    await this.updateChannel(to, valueWei)
    await this.populator.populate()
  }

  private updateChannel = async (recipient: string, valueWeiStr: string): Promise<void> => {
    const lc: LedgerChannel = await this.connext.getChannelByPartyA()

    const valueWei = math.bn(valueWeiStr)
    const lcBalanceWei = math.bn(lc.ethBalanceA)

    if (valueWei.gt(lcBalanceWei)) {
      const vcs = await getVirtualChannels(lc.channelId)

      const vcBalancesWei = await aggregateVCBalancesWEI(
        getAddress(this.store),
        vcs
      ).amountBN

      const totalBalanceWei = lcBalanceWei.add(vcBalancesWei)

      if (valueWei.gt(totalBalanceWei)) {
        throw new Error(`
          value is higher than aggregate virtual channel and ledger channel balances
          value in wei: ${valueWei.toString()}
          lcBalance in wei: ${lcBalanceWei.toString()}
          vcBalance in wei: ${vcBalancesWei.toString()}
          total balance in wei: ${totalBalanceWei.toString()}
          difference between value and total: ${totalBalanceWei.sub(valueWei).toString()}
        `)
      }

      await this.updateChannel(recipient, valueWeiStr)
    }

    const balanceAWei = lcBalanceWei.sub(valueWei)
    const balanceBWei = math.bn(lc.ethBalanceI).add(valueWei)

    await this.connext.updateBalances([{
      type: ChannelType.LEDGER,
      payment: {
        channelId: lc.channelId,
        balanceA: {
          ethDeposit: balanceAWei,
          tokenDeposit: math.bn(lc.tokenBalanceA),
        },
        balanceB: {
          ethDeposit: balanceBWei,
          tokenDeposit: math.bn(lc.tokenBalanceI),
        }
      },
      meta: {
        type: PurchaseMetaType.WITHDRAWAL,
        receiver: recipient,
        // Connext checks for a 'recipient' field, but the hub uses
        // 'receiver'... so leave both these in for now, and we'll settle
        // that later.
        fields: {recipient},
      },
    }])
  }

  private closeChannel = async (): Promise<void> => {
    await this.closeChannelTx.execute()
  }

  private openChannel = async (): Promise<void> => {
    await this.openChannelTx.execute()
  }
}
