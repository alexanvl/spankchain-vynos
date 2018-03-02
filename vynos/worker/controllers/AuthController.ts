import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {
  AuthenticateRequest,
  AuthenticateResponse,
  RespondToAuthorizationRequestRequest,
  SetAuthorizationRequestResponse
} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import {ProviderOpts} from 'web3-provider-engine'
import AuthStateMachine from '../../lib/AuthStateMachine'
import FrameController from './FrameController'
import SharedStateView from '../SharedStateView'

const util = require('ethereumjs-util')

export interface NonceResponse {
  nonce: string
}

export default class AuthController {
  private store: Store<WorkerState>

  private sharedStateView: SharedStateView

  private providerOpts: ProviderOpts

  private frame: FrameController

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView, providerOpts: ProviderOpts, frame: FrameController) {
    this.store = store
    this.sharedStateView = sharedStateView
    this.providerOpts = providerOpts
    this.frame = frame
    this.handler = this.handler.bind(this)
  }

  respondToAuthorizationRequest (message: RespondToAuthorizationRequestRequest, next: Function, end: EndFunction) {
    this.store.dispatch(actions.respondToAuthorizationRequest(message.params[0]))

    const response: SetAuthorizationRequestResponse = {
      id: message.id,
      jsonrpc: message.jsonrpc,
      result: null
    }

    end(null, response)
  }

  async authenticate (message: AuthenticateRequest, next: Function, end: EndFunction) {
    try {
      const isLocked = await this.sharedStateView.isLocked()
      const hubUrl = await this.sharedStateView.getHubUrl()
      const authRealm = await this.sharedStateView.getAuthRealm()
      const origin = message.params[0]

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

        const machine = new AuthStateMachine(this.store, authRealm)
        await machine.awaitAuthorization()
      }

      const token = await this.doAuthenticate(origin)

      this.store.dispatch(actions.setCurrentAuthToken(token))

      const response: AuthenticateResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          success: true,
          token
        }
      }

      end(null, response)
    } catch (e) {
      end(e)
    }
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (RespondToAuthorizationRequestRequest.match(message)) {
      this.respondToAuthorizationRequest(message, next, end)
    } else if (AuthenticateRequest.match(message)) {
      this.authenticate(message, next, end)
    } else {
      next()
    }
  }

  private async doAuthenticate (origin: string): Promise<string> {
    const addresses = await this.sharedStateView.getAccounts()
    const res = await fetch(this.authUrl('challenge'), {
      method: 'POST',
      mode: 'cors'
    })
    const json: NonceResponse = await res.json()
    const nonce = json.nonce
    const signature = await this.signNonce(origin, nonce)

    const responseRes = await fetch(this.authUrl('response'), {
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

    const responseResJson = await responseRes.json()

    return responseResJson.token
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
