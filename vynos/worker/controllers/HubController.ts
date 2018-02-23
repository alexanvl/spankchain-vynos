import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import {ProviderOpts} from 'web3-provider-engine'
import BackgroundController from './BackgroundController'

const util = require('ethereumjs-util')

export interface BrandingResponse {
  cardName: string
  cardImageUrl: string
}

export interface NonceResponse {
  nonce: string
}

export default class HubController {
  store: Store<WorkerState>

  providerOpts: ProviderOpts

  hubUrl: string

  background: BackgroundController

  constructor (store: Store<WorkerState>, providerOpts: ProviderOpts, background: BackgroundController) {
    this.store = store
    this.providerOpts = providerOpts
    this.background = background
  }

  initialize (hubUrl: string): Promise<null> {
    this.hubUrl = hubUrl
    return this.getHubBranding()
  }

  getHubBranding (): Promise<null> {
    return fetch(`${this.hubUrl}/branding`)
      .then((res) => res.json())
      .then((res: BrandingResponse) => this.store.dispatch(actions.setHubBranding({
        hubUrl: this.hubUrl,
        ...res
      }))).then(() => null)
  }

  async authenticate (origin: string): Promise<string> {
    const addresses = await this.background.getAccounts()
    const res = await fetch(`${this.hubUrl}/auth/challenge`, {
      method: 'POST',
      mode: 'cors'
    })
    const json: NonceResponse = await res.json()
    const nonce = json.nonce
    const signature = await this.signNonce(origin, nonce)

    const responseRes = await fetch(`${this.hubUrl}/auth/response`, {
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

    const hashBuf = new Buffer(msg.split('x')[1], 'hex')
    const prefix = new Buffer('\x19Ethereum Signed Message:\n')
    const buf = Buffer.concat([
      prefix,
      new Buffer(String(hashBuf.length)),
      hashBuf
    ])

    const data = this.sha3(buf)

    return new Promise((resolve, reject) => this.providerOpts.signMessage!({data}, (err: any, sig: string) => {
      if (err) {
        return reject(err)
      }

      return resolve(sig)
    }))
  }

  private sha3 (data: string | Buffer) {
    return `0x${util.sha3(data).toString('hex')}`
  }
}
