import StreamProvider from './../lib/StreamProvider'
import {Duplex} from 'readable-stream'
import {
  AuthenticateRequest,
  AuthenticateResponse,
  BuyRequest,
  BuyResponse,
  CloseChannelsForCurrentHubRequest,
  GetSharedStateRequest,
  GetSharedStateResponse,
  InitAccountRequest,
  InitAccountResponse,
  InitializeRequest,
  InitializeResponse,
  ListChannelsRequest,
  ListChannelsResponse,
  ToggleFrameRequest
} from '../lib/rpc/yns'
import {JSONRPC, randomId} from '../lib/Payload'
import {PaymentChannel} from 'machinomy/dist/lib/channel'
import VynosBuyResponse from '../lib/VynosBuyResponse'
import {SharedState} from '../worker/WorkerState'
import {SharedStateBroadcast, SharedStateBroadcastType} from '../lib/rpc/SharedStateBroadcast'
import {PaymentChannelSerde} from 'machinomy/dist/lib/payment_channel'

export default class VynosClient {
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
    let request: CloseChannelsForCurrentHubRequest = {
      id: randomId(),
      method: CloseChannelsForCurrentHubRequest.method,
      jsonrpc: JSONRPC,
      params: [channelId]
    }
    return this.provider.ask<CloseChannelsForCurrentHubRequest, any>(request)
  }

  buy (amount: number, meta: any): Promise<VynosBuyResponse> {
    let request: BuyRequest = {
      id: randomId(),
      method: BuyRequest.method,
      jsonrpc: JSONRPC,
      params: [amount, meta]
    }

    return this.provider.ask(request).then((response: BuyResponse) => response.result)
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

  authenticate (): Promise<AuthenticateResponse> {
    const request: AuthenticateRequest = {
      id: randomId(),
      method: AuthenticateRequest.method,
      jsonrpc: JSONRPC,
      params: [window.location.hostname]
    }

    return this.provider.ask(request) as Promise<AuthenticateResponse>
  }

  toggleFrame (state: boolean, forceRedirect?: string): Promise<void> {
    const request: ToggleFrameRequest = {
      id: randomId(),
      method: ToggleFrameRequest.method,
      jsonrpc: JSONRPC,
      params: [state, forceRedirect]
    }

    return this.provider.ask(request).then(() => {
    })
  }
}
