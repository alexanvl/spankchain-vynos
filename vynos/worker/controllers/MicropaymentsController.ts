import NetworkController from './NetworkController'
import BackgroundController from './BackgroundController'
import {PaymentChannel} from 'machinomy/dist/lib/channel'
import VynosBuyResponse from '../../lib/VynosBuyResponse'
import Machinomy, {BuyResult} from 'machinomy'
import {ProviderOpts} from 'web3-provider-engine'
import ProviderOptions from './ProviderOptions'
import TransactionService from '../TransactionService'
import * as transactions from '../../lib/transactions'
import PurchaseMeta from '../../lib/PurchaseMeta'
import ChannelMetaStorage from '../../lib/storage/ChannelMetaStorage'
import Promise = require('bluebird')
import ZeroClientProvider = require('web3-provider-engine/zero')
import Web3 = require('web3')

export default class MicropaymentsController {
  network: NetworkController
  background: BackgroundController
  account: string
  machinomy: Machinomy
  transactions: TransactionService
  channels: ChannelMetaStorage
  web3: Web3

  constructor (network: NetworkController, background: BackgroundController, transactions: TransactionService) {
    this.network = network
    this.background = background
    this.transactions = transactions
    this.channels = new ChannelMetaStorage()
    this.background.awaitUnlock(() => {
      this.background.getAccounts().then(accounts => {
        this.account = accounts[0]
        let provider = ZeroClientProvider(this.providerOpts(network.rpcUrl))
        this.web3 = new Web3(provider)
      })
    })
  }

  providerOpts (rpcUrl: string): ProviderOpts {
    let providerOptions = new ProviderOptions(this.background, this.transactions, rpcUrl)
    return providerOptions.approving()
  }

  closeChannel (channelId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.background.awaitUnlock(() => {
        this.background.getAccounts().then(accounts => {
          let account = accounts[0]
          let machinomy = new Machinomy(account, this.web3, {databaseUrl: 'nedb://vynos'})
          machinomy.close(channelId).then(() => {
            resolve(channelId)
          }).catch(reject)
        })
      })
    })
  }

  buy (receiver: string, amount: number, gateway: string, meta: string, purchaseMeta: PurchaseMeta, channelValue?: number): Promise<VynosBuyResponse> {
    return new Promise((resolve, reject) => {
      this.background.awaitUnlock(() => {
        this.background.getAccounts().then(accounts => {
          let account = accounts[0]
          let options
          if (channelValue !== undefined) {
            options = {databaseUrl: 'nedb://vynos', minimumChannelAmount: channelValue}
          } else {
            options = {databaseUrl: 'nedb://vynos'}
          }
          let machinomy = new Machinomy(account, this.web3, options)
          return machinomy.buy({
            receiver: receiver,
            price: amount,
            gateway: gateway,
            meta: meta
          }).then(response => {
            return this.channels.insertIfNotExists({
              channelId: response.channelId.toString(),
              title: purchaseMeta.siteName,
              host: purchaseMeta.origin,
              icon: purchaseMeta.siteIcon,
              openingTime: Date.now()
            }).then(() => {
              return response
            })
          }).then(response => {
            let transaction = transactions.micropayment(purchaseMeta, receiver, amount)
            return this.transactions.addTransaction(transaction).then(() => {
              return response
            })
          }).then((res: BuyResult) => {
            return {
              channelId: res.channelId,
              token: res.token
            }
          }).catch(reject)
        })
      })
    })
  }

  listChannels (): Promise<PaymentChannel[]> {
    return new Promise((resolve, reject) => this.background.awaitUnlock(() => {
      this.background.getAccounts().then((accounts: string[]) => {
        const account = accounts[0]
        const machinomy = new Machinomy(account, this.web3, {databaseUrl: 'nedb://vynos'})
        return machinomy.channels().then(resolve).catch(reject)
      })
    }))
  }
}
