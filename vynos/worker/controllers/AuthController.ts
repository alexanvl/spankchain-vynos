import {
  AuthenticateRequest, FinishAuthenticationRequest, RespondToAuthorizationRequestRequest,
  StartAuthenticationRequest
} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import {ProviderOpts} from 'web3-provider-engine'
import AuthStateMachine from '../../lib/AuthStateMachine'
import FrameController from './FrameController'
import SharedStateView from '../SharedStateView'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import requestJson from '../../frame/lib/request'

const util = require('ethereumjs-util')

export interface NonceResponse {
  nonce: string
}

export default class AuthController extends AbstractController {
  private store: Store<WorkerState>

  private sharedStateView: SharedStateView

  private providerOpts: ProviderOpts

  private frame: FrameController

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView, providerOpts: ProviderOpts, frame: FrameController) {
    super()
    this.store = store
    this.sharedStateView = sharedStateView
    this.providerOpts = providerOpts
    this.frame = frame
  }

  respondToAuthorizationRequest (res: boolean) {
    this.store.dispatch(actions.respondToAuthorizationRequest(res))
  }

  async authenticate(origin: string) {
    await this.startAuthentication()
    return this.finishAuthentication(origin, true)
  }

  async startAuthentication() {
    const isLocked = await this.sharedStateView.isLocked()
    const hubUrl = await this.sharedStateView.getHubUrl()
    const authRealm = await this.sharedStateView.getAuthRealm()

    if (isLocked) {
      this.frame.show()
      await this.sharedStateView.awaitUnlock()
    }

    const hasAuthorizedHub = await this.sharedStateView.hasAuthorizedHub(hubUrl)

    if (!hasAuthorizedHub) {
      this.frame.show()

      this.store.dispatch(actions.setAuthorizationRequest({
        hubUrl,
        authRealm
      }))
    }
  }

  async finishAuthentication(origin: string, awaitResponse: boolean = false) {
    if (awaitResponse) {
      const authRealm = await this.sharedStateView.getAuthRealm()
      const machine = new AuthStateMachine(this.store, authRealm)
      await machine.awaitAuthorization()
    }

    const token = await this.doChallengeResponse(origin)
    this.store.dispatch(actions.setCurrentAuthToken(token))
    this.store.dispatch(actions.respondToAuthorizationRequest(true))

    return {
      success: true,
      token
    }
  }

  registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, RespondToAuthorizationRequestRequest.method, this.respondToAuthorizationRequest)
    this.registerHandler(server, AuthenticateRequest.method, this.authenticate)
    this.registerHandler(server, StartAuthenticationRequest.method, this.startAuthentication)
    this.registerHandler(server, FinishAuthenticationRequest.method, this.finishAuthentication)
  }

  private async doChallengeResponse (origin: string): Promise<string> {
    const addresses = await this.sharedStateView.getAccounts()
    const res = await requestJson<NonceResponse>(this.authUrl('challenge'), {
      method: 'POST',
      mode: 'cors'
    })
    const nonce = res.nonce
    const signature = await this.signNonce(origin, nonce)

    const responseRes = await requestJson<{token: string}>(this.authUrl('response'), {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        signature,
        origin,
        nonce,
        address: addresses[0]
      })
    })

    return responseRes.token
  }

  private signNonce (origin: string, nonce: string): Promise<string> {
    let msg = this.sha3(`SpankWallet authentication message: ${this.sha3(nonce)} ${this.sha3(origin)}`)

    return new Promise((resolve, reject) => this.providerOpts.signMessage!({data: msg}, (err: any, sig: string) => {
      if (err) {
        return reject(err)
      }

      return resolve(sig)
    }))
  }

  private sha3 (data: string | Buffer) {
    return `0x${util.sha3(data).toString('hex')}`
  }

  private authUrl (path: string): string {
    return `${this.store.getState().runtime.currentHubUrl}/auth/${path}`
  }
}
