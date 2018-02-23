import StreamProvider from './../lib/StreamProvider'
import {Duplex} from 'readable-stream'
import {
  AuthenticateRequest, AuthenticateResponse,
  BuyRequest,
  BuyResponse,
  CloseChannelRequest,
  GetSharedStateRequest,
  GetSharedStateResponse,
  InitAccountRequest,
  InitAccountResponse,
  InitializeRequest,
  InitializeResponse,
  ListChannelsRequest,
  ListChannelsResponse
} from '../lib/rpc/yns'
import {JSONRPC, randomId} from '../lib/Payload'
import {PaymentChannel} from 'machinomy/dist/lib/channel'
import Vynos from '../lib/Vynos'
import VynosBuyResponse from '../lib/VynosBuyResponse'
import PurchaseMeta, {purchaseMetaFromDocument} from '../lib/PurchaseMeta'
import {SharedState} from '../worker/WorkerState'
import {SharedStateBroadcast, SharedStateBroadcastType} from '../lib/rpc/SharedStateBroadcast'
import {PaymentChannelSerde} from 'machinomy/dist/lib/payment_channel'
import Promise = require('bluebird')

export default class VynosClient implements Vynos {
  provider: StreamProvider

  constructor (stream: Duplex) {
    this.provider = new StreamProvider('VynosClient')
    this.provider.pipe(stream).pipe(this.provider)
  }

  initialize (hubUrl: string, authRealm: string): Promise<boolean> {
    const request: InitializeRequest = {
      id: randomId(),
      method: InitializeRequest.method,
      jsonrpc: JSONRPC,
      params: [hubUrl, authRealm]
    }

    return this.provider.ask(request).then((res: InitializeResponse) => {
      return res.result
    })
  }

  depositToChannel (ch: PaymentChannel): Promise<PaymentChannel> {
    return Promise.resolve(ch)
  }

  initAccount (): Promise<void> {
    let request: InitAccountRequest = {
      id: randomId(),
      method: InitAccountRequest.method,
      jsonrpc: JSONRPC,
      params: []
    }
    return this.provider.ask(request).then((response: InitAccountResponse) => {
      return
    })
  }

  closeChannel (channelId: string): Promise<void> {
    let request: CloseChannelRequest = {
      id: randomId(),
      method: CloseChannelRequest.method,
      jsonrpc: JSONRPC,
      params: [channelId]
    }
    return this.provider.ask<CloseChannelRequest, any>(request)
  }

  buy (receiver: string, amount: number, gateway: string, meta: string, purchase?: PurchaseMeta, channelValue?: number): Promise<VynosBuyResponse> {
    let _purchase = purchase || purchaseMetaFromDocument(document)
    let request: BuyRequest = {
      id: randomId(),
      method: BuyRequest.method,
      jsonrpc: JSONRPC,
      params: [receiver, amount, gateway, meta, _purchase, channelValue ? channelValue : amount * 10]
    }
    return this.provider.ask(request).then((response: BuyResponse) => {
      if (response.error) {
        return Promise.reject(response.error)
      } else if (!response.result[0].channelId) {
        return Promise.reject(response.result[1])
      } else {
        return response.result[0]
      }
    })
  }

  listChannels (): Promise<PaymentChannel[]> {
    let request: ListChannelsRequest = {
      id: randomId(),
      method: ListChannelsRequest.method,
      jsonrpc: JSONRPC,
      params: []
    }
    return this.provider.ask(request).then((response: ListChannelsResponse) => {
      return response.result.map(pc => PaymentChannelSerde.instance.deserialize(pc))
    })
  }

  getSharedState (): Promise<GetSharedStateResponse> {
    const request: GetSharedStateRequest = {
      id: randomId(),
      method: GetSharedStateRequest.method,
      jsonrpc: JSONRPC,
      params: []
    }

    return this.provider.ask(request)
  }

  onSharedStateUpdate (fn: (state: SharedState) => void): void {
    this.provider.listen<SharedStateBroadcast>(SharedStateBroadcastType, broadcast => {
      let state = broadcast.result
      fn(state)
    })
  }

  authenticate(): Promise<AuthenticateResponse> {
    const request: AuthenticateRequest = {
      id: randomId(),
      method: AuthenticateRequest.method,
      jsonrpc: JSONRPC,
      params: [window.location.hostname]
    }

    return this.provider.ask(request) as Promise<AuthenticateResponse>
  }
}
