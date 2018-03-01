import VynosClient from './VynosClient'
import * as EventEmitter from 'events'
import Frame from './Frame'
import FrameStream from '../lib/FrameStream'
import {BROWSER_NOT_SUPPORTED_TEXT} from '../frame/constants'
import {WalletOptions} from '../WalletOptions'
import {SharedState} from '../worker/WorkerState'
import * as BigNumber from 'bignumber.js';

// DOM and Window is ready.
async function isReady (): Promise<any> {
  return new Promise((resolve) => {
    const state = document.readyState

    if (state === 'complete' || state === 'interactive') {
      return setTimeout(resolve, 0)
    }

    document.addEventListener('DOMContentLoaded', resolve)
  })
}

export default class Namespace {
  private options: WalletOptions

  private client: VynosClient

  private eventBus: EventEmitter

  private isOpen: boolean

  private frame: Frame

  private previousState: SharedState

  constructor (options: WalletOptions) {
    this.options = options
    this.eventBus = new EventEmitter()
  }

  async buy (amount: BigNumber.BigNumber, meta: any): Promise<void> {
    return this.client.buy(amount.toNumber(), meta).then(() => {})
  }

  on (event: string, callback: (...args: any[]) => void) {
    return this.eventBus.on(event, callback)
  }

  off (event: string, callback: (...args: any[]) => void) {
    return this.eventBus.removeListener(event, callback)
  }

  isWalletOpen (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isOpen
        ? resolve()
        : reject(new Error('Wallet is not opened.'))
    })
  }

  // Initialize frame container for the Wallet.
  // Optional to use.
  async init (frameElement?: HTMLIFrameElement, frame?: Frame): Promise<VynosClient> {
    if (this.client) {
      return this.client
    }

    await isReady()

    this.isOpen = false
    this.frame = frame ? frame : new Frame(this.options.scriptElement.src, frameElement)
    this.frame.attach(this.options.window.document)

    const stream = new FrameStream('vynos').toFrame(this.frame.element)
    this.client = new VynosClient(stream)

    await this.client.initialize(this.options.hubUrl, this.options.authRealm)
    this.previousState = (await this.client.getSharedState()).result
    this.eventBus.emit('update', this.previousState)

    window.onmessage = (e: any) => {
      const { data } = e

      if (!data || !data.type) {
        return
      }

      switch (data.type) {
        case 'vynos/parent/signupComplete':
          this.eventBus.emit('signupComplete')
          return
        default:
          return
      }
    }

    this.client.onSharedStateUpdate((nextState: SharedState) => {
      this.eventBus.emit('update', nextState)
      this.handleSpecificEvents(nextState)

      if (nextState.isTransactionPending) {
        this.display()
      }

      this.previousState = nextState
    })

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.which === 27) {
        this.client.toggleFrame(false)
      }
    })

    return this.client
  }

  async setupAndLogin (): Promise<{ token: string }> {
    const client = await this.ready()
    const res = await client.authenticate()
    const token = res.result.token
    this.eventBus.emit('didAuthenticate', res.result.token)

    if (!token) {
      throw new Error('No token returned.')
    }

    return {
      token
    }
  }

  async display () {
    return this.client.toggleFrame(true)
  }

  private async doDisplay() {
    await this.ready()
    const {didInit, isLocked} = (await this.client.getSharedState()).result

    this.isOpen = true

    if (!didInit || isLocked) {
      this.frame.displayFull()
    } else {
      this.frame.display()
    }
  }

  private doHide() {
    this.ready()
      .then(client => client.getSharedState())
      .then(({result: {didInit, isLocked}}) => {
        this.isOpen = false
        if (!didInit || isLocked) {
          this.frame.hideFull()
        } else {
          this.frame.hide()
        }
      })
  }

  setContainerStyle (style: CSSStyleDeclaration): void {
    this.frame.setContainerStyle(style)
  }

  async hide () {
    return this.client.toggleFrame(false)
  }

  async ready (): Promise<VynosClient> {
    if ('serviceWorker' in navigator) {
      return this.client || this.init()
    } else {
      throw new Error(BROWSER_NOT_SUPPORTED_TEXT)
    }
  }

  private handleSpecificEvents(newState: SharedState) {
    if (this.previousState.isFrameDisplayed !== newState.isFrameDisplayed) {
      if (newState.isFrameDisplayed) {
        this.doDisplay()
      } else {
        this.doHide()
      }
    }

    if (this.previousState.isLocked !== newState.isLocked) {
      this.eventBus.emit(newState.isLocked ? 'didLock' : 'didUnlock')
    }

    if (this.previousState.didInit !== newState.didInit && newState.didInit) {
      this.eventBus.emit('didInit')
    }
  }
}
