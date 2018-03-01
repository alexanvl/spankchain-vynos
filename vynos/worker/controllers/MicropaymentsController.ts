import {PaymentChannel} from 'machinomy/dist/lib/channel'
import VynosBuyResponse from '../../lib/VynosBuyResponse'
import Machinomy from 'machinomy'
import TransactionService from '../TransactionService'
import * as transactions from '../../lib/transactions'
import PurchaseMeta from '../../lib/PurchaseMeta'
import ChannelMetaStorage from '../../lib/storage/ChannelMetaStorage'
import SharedStateView from '../SharedStateView'
import {ProviderOpts} from 'web3-provider-engine'
import ZeroClientProvider = require('web3-provider-engine/zero')
import Web3 = require('web3')
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import {LifecycleAware} from './LifecycleAware'
import * as actions from '../actions';
import {PaymentChannelSerde} from 'machinomy/dist/lib/payment_channel'
import Payment from 'machinomy/dist/lib/payment'

export default class MicropaymentsController {
  providerOpts: ProviderOpts

  store: Store<WorkerState>

  sharedStateView: SharedStateView

  machinomy: Machinomy

  transactions: TransactionService

  channels: ChannelMetaStorage

  web3: Web3

  constructor (providerOpts: ProviderOpts, store: Store<WorkerState>, sharedStateView: SharedStateView, transactions: TransactionService) {
    this.providerOpts = providerOpts
    this.store = store
    this.sharedStateView = sharedStateView
    this.transactions = transactions
    this.channels = new ChannelMetaStorage()
  }

  public async populateChannels(): Promise<void> {
    const machinomy = await this.getMachinomy()
    const channels = await machinomy.channels()

    this.store.dispatch(actions.setChannels(channels.map(
      (ch: PaymentChannel) => PaymentChannelSerde.instance.serialize(ch))))
  }

  public async openChannel (receiver: string, value: number): Promise<PaymentChannel> {
    const machinomy = await this.getMachinomy()
    const chan = await machinomy.open(receiver, value)
    this.store.dispatch(actions.setChannel(PaymentChannelSerde.instance.serialize(chan)))
    return chan
  }

  public async closeChannel (channelId: string): Promise<string> {
    const machinomy = await this.getMachinomy()
    await machinomy.close(channelId)
    return channelId
  }

  async buy (receiver: string, price: number, meta: string, purchaseMeta: PurchaseMeta): Promise<VynosBuyResponse> {
    const machinomy = await this.getMachinomy()
    const gateway = await this.sharedStateView.getHubUrl()
    const res = await machinomy.buy({
      receiver,
      price,
      gateway,
      meta
    })

    await this.channels.insertIfNotExists({
      channelId: res.channelId,
      title: purchaseMeta.siteName,
      host: purchaseMeta.origin,
      icon: purchaseMeta.siteIcon,
      openingTime: Date.now()
    })

    const transaction = transactions.micropayment(purchaseMeta, receiver, price)
    await this.transactions.addTransaction(transaction)

    return {
      channelId: res.channelId,
      token: res.token
    }
  }

  async listChannels (): Promise<PaymentChannel[]> {
    const machinomy = await this.getMachinomy()
    return machinomy.channels()
  }

  private async getMachinomy (): Promise<Machinomy> {
    if (this.machinomy) {
      return this.machinomy
    }

    const accounts = await this.sharedStateView.getAccounts()
    const web3 = new Web3(ZeroClientProvider(this.providerOpts))
    this.machinomy = new Machinomy(accounts[0], web3, {databaseUrl: 'nedb://vynos'})
    return this.machinomy
  }
}
