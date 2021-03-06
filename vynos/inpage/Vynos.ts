import VynosClient from './VynosClient'
import * as EventEmitter from 'events'
import Frame from './Frame'
import {WalletOptions} from '../WalletOptions'
import {SharedState} from '../worker/WorkerState'
import Web3 = require('web3')
import VynosBuyResponse from '../lib/VynosBuyResponse'
import * as metrics from '../lib/metrics'
import BN = require('bn.js')
import {ICurrency} from '../lib/currency/Currency'
import {VynosPurchase} from '../lib/VynosPurchase'

export interface Balance {
  balanceInWei: string|null
  balanceInTokens: string|null
}

export interface GetBalanceResponse {
  wallet: Balance
  channels: {
    [key: string]: Balance
  }
}

export default class Vynos extends EventEmitter {
  private options: WalletOptions

  private client: VynosClient|null = null

  private open: boolean = false

  private ready: boolean = false

  private frame: Frame|null = null

  private previousState: SharedState|null = null

  private initializing: Promise<void>|null = null

  provider: any

  constructor (options: WalletOptions) {
    super()
    this.options = options
    this.handleSharedStateUpdate = this.handleSharedStateUpdate.bind(this)
  }

  public getSharedState = () => this.client!.getSharedState()

  public async getBalance(): Promise<GetBalanceResponse> {
    this.requireReady()

    return this.client!.getSharedState()
      .then(state => {
        const { addressBalances, channel } = state

        const channels = {} as any

        if (channel) {
          channels[channel.ledgerId] = {
            balanceInWei: channel.balances.ethBalance.amount,
            balanceInTokens: channel.balances.tokenBalance.amount,
          }
        }

        return {
          wallet: {
            balanceInWei: addressBalances.ethBalance.amount,
            balanceInTokens: addressBalances.tokenBalance.amount ,
          },
          channels
        }
      })
  }

  public async buy (purchase: VynosPurchase<any>): Promise<VynosBuyResponse|null> {
    this.requireReady()
    const { didInit, isLocked } = await this.client!.getSharedState()

    if (!didInit || isLocked) {
      this.show()
      return null
    }

    let res

    try {
      res = await this.client!.buy(purchase)
    } catch (err) {
      this.emit('error', err)
      throw err
    }

    this.emit('didBuy', res)
    return res
  }

  public async lock() {
    this.requireReady()
    return this.client!.lock()
  }

  public show(opts?:{ forceRedirect?: string, isPerformer?: boolean }) {
    opts = opts || {}
    this.requireReady()
    this.client!.toggleFrame(true, opts.forceRedirect, opts.isPerformer)
      .catch((e: any) => this.emit('error', e))
  }

  public setUsername(username: string): Promise<void> {
    this.requireReady()
    return this.client!.setUsername(username)
  }

  public setNeedsCollateral(needsCollateral: boolean): Promise<void> {
    this.requireReady()
    return this.client!.setNeedsCollateral(needsCollateral)
  }

  public setIsPendingVerification(isPendingVerification: boolean): Promise<void> {
    this.requireReady()
    return this.client!.setIsPendingVerification(isPendingVerification)
  }

  public hide() {
    this.requireReady()
    this.client!.toggleFrame(false)
      .catch((e: any) => this.emit('error', e))
  }

  public isReady(): boolean {
    return this.ready
  }

  public isOpen(): boolean {
    return this.open
  }

  public async init () {
    if (this.ready) {
      return
    }

    if (this.initializing) {
      return this.initializing
    }

      this.initializing = this.doInit()
    return this.initializing
  }

  public setMetricLogFunc(func: (metrics: metrics.Metric[]) => void) {
    metrics.setLogFunc(func)
  }

  private async doInit() {
    await this.domReady()

    this.frame = new Frame(this.options.scriptElement.src)
      await this.frame.attach(this.options.window.document)

    const src = this.frame.element.src
    const parts = src.split('/')
    const origin = `${parts[0]}//${parts[2]}`

    this.client = new VynosClient(this.frame.element.contentWindow!, origin)
    await this.client.initialize()
    this.previousState = await this.client.getSharedState()
    this.client.onSharedStateUpdate(this.handleSharedStateUpdate)
    this.emit('update', this.previousState)

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.which === 27) {
        this.client!.toggleFrame(false)
      }
    })

    this.ready = true
    this.emit('ready')

    if (!this.previousState.isLocked) {
      this.emit('didUnlock', this.previousState.address)
    }
  }

  async setupAndLogin (): Promise<{ token: string }> {
    this.requireReady()

    const res = await this.client!.authenticate()
    const token = res.token


    if (!token) {
      throw new Error('No token returned.')
    }

    return {
      token
    }
  }

  setContainerStyle (style: CSSStyleDeclaration): void {
    this.frame!.setContainerStyle(style)
  }

  private handleSpecificEvents(newState: SharedState) {
    if (this.previousState!.isFrameDisplayed !== newState.isFrameDisplayed) {
      if (newState.isFrameDisplayed) {
        this.emit('didShow')
      } else {
        this.emit('didHide')
      }
    }

    if (newState.isFrameDisplayed) {
      this.frame!.display()
    } else {
      this.frame!.hide()
    }

    if (this.previousState!.isLocked !== newState.isLocked) {
      this.emit(newState.isLocked ? 'didLock' : 'didUnlock')
    }

    if (this.previousState!.didInit !== newState.didInit && newState.didInit) {
      this.emit('didOnboard')
    }

    if (this.previousState!.currentAuthToken !== newState.currentAuthToken && newState.currentAuthToken) {
      this.emit('didAuthenticate', newState.currentAuthToken)
    }
  }

  private requireReady() {
    if (!this.ready) {
      throw new Error('Wallet not ready yet.')
    }
  }

  private async requireUnlock() {
    if (!this.client || !(await this.client.getSharedState()).isLocked) {
      throw new Error('Wallet is not unlocked yet')
    }
  }

  private domReady (): Promise<any> {
    return new Promise((resolve) => {
      const state = document.readyState

      if (state === 'complete' || state === 'interactive') {
        return resolve()
      }

      document.addEventListener('DOMContentLoaded', resolve)
    })
  }

  private handleSharedStateUpdate(nextState: SharedState) {
    this.handleSpecificEvents(nextState)
    this.emit('update', nextState)
    this.previousState = nextState
  }
}
