import {PaymentChannel} from 'machinomy/dist/lib/channel'
import VynosBuyResponse from './VynosBuyResponse'
import {GetSharedStateResponse} from './rpc/yns'
import PurchaseMeta from './PurchaseMeta'
import Promise = require('bluebird')
import Web3 = require('web3')

export default interface Vynos {
  provider: Web3.Provider
  depositToChannel: (ch: PaymentChannel) => Promise<PaymentChannel>
  closeChannel: (channelId: string) => Promise<void>
  listChannels: () => Promise<PaymentChannel[]>
  initAccount: () => Promise<void>
  getSharedState: () => Promise<GetSharedStateResponse>
  buy: (receiver: string, amount: number, gateway: string, meta: string, purchaseMeta?: PurchaseMeta) => Promise<VynosBuyResponse>
}
