import StreamProvider from '../lib/StreamProvider'
import {EventEmitter} from 'events'
import {HistoryItem, SharedState} from '../worker/WorkerState'
import {JSONRPC, randomId, ResponsePayload} from '../lib/Payload'
import {isSharedStateBroadcast, SharedStateBroadcastType} from '../lib/rpc/SharedStateBroadcast'
import {
  AuthenticateRequest,
  AuthenticateResponse,
  ChangeNetworkRequest, CloseChannelsForCurrentHubRequest,
  DidStoreMnemonicRequest, FetchHistoryRequest,
  GenKeyringRequest,
  GenKeyringResponse,
  GetPrivateKeyHexRequest,
  GetPrivateKeyHexResponse,
  GetSharedStateRequest,
  GetSharedStateResponse,
  LockWalletRequest,
  OpenChannelRequest, OpenChannelResponse, PopulateChannelsRequest,
  RememberPageRequest,
  RespondToAuthorizationRequestRequest,
  RestoreWalletRequest,
  RestoreWalletResponse,
  ToggleFrameRequest,
  TransactonResolved,
  UnlockWalletRequest,
  UnlockWalletResponse,
  WatchWalletBalanceRequest,
} from '../lib/rpc/yns'
import {Action} from 'redux'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js';

export default class WorkerProxy extends EventEmitter {
  provider: StreamProvider
  web3: Web3

  constructor () {
    super()
    this.provider = new StreamProvider('WorkerProxy')
    this.provider.listen(SharedStateBroadcastType, data => {
      if (isSharedStateBroadcast(data)) {
        this.emit(SharedStateBroadcastType, data)
      }
    })
    this.web3 = new Web3(this.provider)
  }

  openChannelWithCurrentHub (amount: BigNumber.BigNumber): Promise<string> {
    const request: OpenChannelRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: OpenChannelRequest.method,
      params: [amount.toNumber()]
    }

    return this.provider.ask(request).then((res: OpenChannelResponse) => res.result)
  }

  closeChannelsForCurrentHub(): Promise<void> {
    const request: CloseChannelsForCurrentHubRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: CloseChannelsForCurrentHubRequest.method,
      params: []
    }

    return this.provider.ask(request).then(() => {})
  }

  populateChannels(): Promise<void> {
    const request: PopulateChannelsRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: PopulateChannelsRequest.method,
      params: []
    }

    return this.provider.ask(request).then(() => {})
  }

  getWeb3 (): Web3 {
    return new Web3(this.provider)
  }

  doLock (): Promise<void> {
    let request: LockWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: LockWalletRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  doUnlock (password: string): Promise<string | undefined> {
    let request: UnlockWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: UnlockWalletRequest.method,
      params: [password]
    }
    return this.provider.ask(request).then((response: UnlockWalletResponse) => {
      return response.error
    })
  }

  genKeyring (password: string): Promise<string> {
    let request: GenKeyringRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: GenKeyringRequest.method,
      params: [password]
    }
    return this.provider.ask(request).then((response: GenKeyringResponse) => {
      return response.result
    })
  }

  restoreWallet (password: string, mnemonic: string): Promise<string> {
    let request: RestoreWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: RestoreWalletRequest.method,
      params: [password, mnemonic]
    }
    return this.provider.ask(request).then((response: RestoreWalletResponse) => {
      return response.result
    })
  }

  getSharedState (): Promise<SharedState> {
    const id = randomId()

    let request: GetSharedStateRequest = {
      id,
      jsonrpc: JSONRPC,
      method: GetSharedStateRequest.method,
      params: []
    }
    return this.provider.ask(request).then((response: GetSharedStateResponse) => {
      return response.result
    })
  }

  didStoreMnemonic (): Promise<void> {
    let request: DidStoreMnemonicRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: DidStoreMnemonicRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  rememberPage (path: string): void {
    let request: RememberPageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: RememberPageRequest.method,
      params: [path]
    }
    this.provider.ask(request).then(() => {
      // Do Nothing
    })
  }

  resolveTransaction (): void {
    let request: TransactonResolved = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: TransactonResolved.method,
      params: []
    }
    this.provider.ask(request)
  }

  getPrivateKeyHex (): Promise<string> {
    let request: GetPrivateKeyHexRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: GetPrivateKeyHexRequest.method,
      params: []
    }
    return this.provider.ask(request).then((response: GetPrivateKeyHexResponse) => {
      return response.result
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

  respondToAuthorizationRequest (res: boolean): Promise<void> {
    const request: RespondToAuthorizationRequestRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: RespondToAuthorizationRequestRequest.method,
      params: [res]
    }

    return this.provider.ask(request).then(() => {
    })
  }

  toggleFrame (status: boolean, forceRedirect?: string): Promise<void> {
    const request: ToggleFrameRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ToggleFrameRequest.method,
      params: [status, forceRedirect]
    }

    return this.provider.ask(request).then(() => {
    })
  }

  dispatch<A extends Action> (action: A) {
    console.warn('WorkerProxy#dispatch', action)
  }

  changeNetwork (): Promise<void> {
    let request: ChangeNetworkRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ChangeNetworkRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  fetchHistory (): Promise<HistoryItem[]> {
    const request: FetchHistoryRequest = {
      id: randomId(),
      method: FetchHistoryRequest.method,
      jsonrpc: JSONRPC,
      params: []
    }

    return this.provider.ask(request).then((res: ResponsePayload) => res.result)
  }

  watchWalletBalance(): Promise<void> {
    console.log('method: ', WatchWalletBalanceRequest.method)
    const request: WatchWalletBalanceRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: WatchWalletBalanceRequest.method,
      params: [],
    }

    return this.provider.ask(request).then(() => {})
  }
}
