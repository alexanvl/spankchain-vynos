import {HistoryItem, SharedState} from '../worker/WorkerState'
import {
  AuthenticateRequest,
  AuthenticateResponse,
  CloseLedgerChannels,
  DepositRequest,
  DidStoreMnemonicRequest,
  FetchHistoryRequest,
  GenerateRestorationCandidates,
  GenKeyringRequest,
  GetSharedStateRequest,
  LockWalletRequest,
  RecoverChannelRequest,
  RememberPageRequest,
  ResetRequest,
  RestoreWalletRequest,
  RevealPrivateKeyRequest,
  SendRequest,
  SetUsernameRequest,
  StatusRequest,
  ToggleFrameRequest,
  UnlockWalletRequest
} from '../lib/rpc/yns'
import JsonRpcClient from '../lib/messaging/JsonRpcClient'
import {WorkerStatus} from '../lib/rpc/WorkerStatus'
import {Postable} from '../lib/messaging/Postable'
import * as metrics from '../lib/metrics'
import RestorationCandidate from '../lib/RestorationCandidate'
import {RPC_URL} from '../worker/controllers/ProviderOptions'

const Web3 = require('web3')

import BN = require('bn.js')

function timed (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  let oldFunc = descriptor.value

  descriptor.value = function () {
    let res = oldFunc.apply(this, arguments)
    return metrics.timed('vynos:' + propertyKey, res, {
      rpcUrl: RPC_URL,
      arguments: Array.prototype.slice.call(arguments)
    })
  }

  return descriptor
}

export default class WorkerProxy extends JsonRpcClient {
  web3: any

  constructor (target: Postable) {
    super('WorkerProxy', target, navigator.serviceWorker, window.location.origin)

    const send = (payload: any, callback: (err: Error, result: any) => void) => {
      this.call(payload.method, ...payload.params).then((res: any) => {
        // rewrite the ID
        res.id = payload.id
        const cb = callback as any
        cb(null, res)
      }).catch((e: any) => {
        (callback as any)(e, null)
      })
    }

    this.web3 = new Web3({
      sendAsync: send,
      send
    })
  }

  @timed
  closeLedgerChannels (): Promise<void> {
    return this.call(CloseLedgerChannels.method)
  }

  @timed
  deposit (amount: BN): Promise<void> {
    return this.call(DepositRequest.method, amount.toString())
  }

  getWeb3 (): any {
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

  restoreWallet (password: string, mnemonic: string, hd: boolean): Promise<string> {
    return this.call(RestoreWalletRequest.method, password, mnemonic, hd)
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

  toggleFrame (status: boolean, forceRedirect?: string): Promise<void> {
    return this.call(ToggleFrameRequest.method, status, forceRedirect)
  }

  fetchHistory (): Promise<HistoryItem[]> {
    return this.call(FetchHistoryRequest.method)
  }

  @timed
  send (to: string, value: string): Promise<void> {
    return this.call(SendRequest.method, to, value)
  }

  setUsername (username: string): Promise<void> {
    return this.call(SetUsernameRequest.method, username)
  }

  status (): Promise<WorkerStatus> {
    return this.callWithTimeout(5000, StatusRequest.method)
  }

  reset (): Promise<void> {
    return this.call(ResetRequest.method)
  }

  recoverChannel (channelId: string): Promise<void> {
    return this.call(RecoverChannelRequest.method, channelId)
  }

  revealPrivateKey (mnemonic: string): Promise<string> {
    return this.call(RevealPrivateKeyRequest.method, mnemonic)
  }

  generateRestorationCandidates (mnemonic: string): Promise<RestorationCandidate[]> {
    return this.call(GenerateRestorationCandidates.method, mnemonic)
  }
}
