import {HistoryItem, SharedState} from '../worker/WorkerState'
import {
  AuthenticateRequest,
  AuthenticateResponse,
  CloseChannelsForCurrentHubRequest, DepositRequest,
  DidStoreMnemonicRequest,
  FetchHistoryRequest, FinishAuthenticationRequest,
  GenKeyringRequest,
  GetSharedStateRequest,
  LockWalletRequest,
  PopulateChannelsRequest,
  RememberPageRequest,
  RespondToAuthorizationRequestRequest,
  RestoreWalletRequest,
  SendRequest, StartAuthenticationRequest,
  StatusRequest,
  ToggleFrameRequest,
  UnlockWalletRequest
} from '../lib/rpc/yns'
import * as BigNumber from 'bignumber.js'
import JsonRpcClient from '../lib/messaging/JsonRpcClient'
import {WorkerStatus} from '../lib/rpc/WorkerStatus'
import {JSONRPCResponsePayload} from 'web3'
import Web3 = require('web3')
import {Postable} from '../lib/messaging/Postable'

export default class WorkerProxy extends JsonRpcClient {
  web3: Web3

  constructor (target: Postable) {
    super('WorkerProxy', target, navigator.serviceWorker, window.location.origin)
    this.web3 = new Web3({
      sendAsync: (payload: Web3.JSONRPCRequestPayload,
                  callback: (err: Error, result: JSONRPCResponsePayload) => void) => {
        this.call(payload.method, ...payload.params)
          .then((res: JSONRPCResponsePayload) => {
            (callback as any)(null, res)
          })
          .catch((e: any) => {
            (callback as any)(e, null)
          })
      }
    })
  }

  closeChannelsForCurrentHub (): Promise<void> {
    return this.call(CloseChannelsForCurrentHubRequest.method)
  }

  deposit (amount: BigNumber.BigNumber): Promise<void> {
    return this.call(DepositRequest.method, amount.toNumber())
  }

  populateChannels (): Promise<void> {
    return this.call(PopulateChannelsRequest.method)
  }

  getWeb3 (): Web3 {
    return this.web3
  }

  doLock (): Promise<void> {
    return this.call(LockWalletRequest.method)
  }

  doUnlock (password: string): Promise<string | undefined> {
    return this.call(UnlockWalletRequest.method, password)
  }

  genKeyring (password: string): Promise<string> {
    return this.call(GenKeyringRequest.method, password)
  }

  restoreWallet (password: string, mnemonic: string): Promise<string> {
    return this.call(RestoreWalletRequest.method, password, mnemonic)
  }

  getSharedState (): Promise<SharedState> {
    return this.call(GetSharedStateRequest.method)
  }

  didStoreMnemonic (): Promise<void> {
    return this.call(DidStoreMnemonicRequest.method)
  }

  rememberPage (path: string): Promise<void> {
    return this.call(RememberPageRequest.method, path)
  }

  authenticate (): Promise<AuthenticateResponse> {
    return this.call(AuthenticateRequest.method, window.location.hostname)
  }

  startAuthentication (): Promise<void> {
    return this.call(StartAuthenticationRequest.method)
  }

  finishAuthentication (): Promise<void> {
    return this.call(FinishAuthenticationRequest.method, window.location.hostname)
  }

  respondToAuthorizationRequest (res: boolean): Promise<void> {
    return this.call(RespondToAuthorizationRequestRequest.method, res)
  }

  toggleFrame (status: boolean, forceRedirect?: string): Promise<void> {
    return this.call(ToggleFrameRequest.method, status, forceRedirect)
  }

  fetchHistory (): Promise<HistoryItem[]> {
    return this.call(FetchHistoryRequest.method)
  }

  send (to: string, value: string, gas?: string, gasPrice?: string): Promise<void> {
    return this.call(SendRequest.method, to, value, gas, gasPrice)
  }

  status (): Promise<WorkerStatus> {
    return this.callWithTimeout(500, StatusRequest.method)
  }
}
