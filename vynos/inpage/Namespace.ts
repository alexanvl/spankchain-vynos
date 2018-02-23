import VynosClient from './VynosClient'
import Promise = require('bluebird')
import * as EventEmitter from 'events'
import Frame from './Frame'
import FrameStream from '../lib/FrameStream'
import Vynos from '../lib/Vynos'
import { BROWSER_NOT_SUPPORTED_TEXT } from '../frame/constants'

// DOM and Window is ready.
export function isReady(callback: () => void) {
  let state = document.readyState
  if (state === 'complete' || state === 'interactive') {
    return setTimeout(callback, 0)
  }

  document.addEventListener('DOMContentLoaded', function onLoad() {
    callback()
  })
}

export default class Namespace {
  scriptAddress: string
  window: Window
  client?: Promise<VynosClient>
  frame: Frame
  eventBus: EventEmitter
  isOpen: boolean

  constructor(scriptElement: HTMLScriptElement, window: Window) {
    this.scriptAddress = scriptElement.src
    this.window = window
    this.eventBus = new EventEmitter()
  }

  on(event: string, callback: (...args: any[]) => void) {
    return this.eventBus.on(event, callback)
  }

  isWalletOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isOpen
        ? resolve()
        : reject(new Error('Wallet is not opened.'))
    })
  }
  // Initialize frame container for the Wallet.
  // Optional to use.
  init(frameElement?: HTMLIFrameElement, frame?: Frame): Promise<Vynos> {
    if (this.client) {
      return this.client
    }

    this.client = new Promise(resolve => {
      isReady(() => {
        this.isOpen = false
        this.frame = frame ? frame : new Frame(this.scriptAddress, frameElement)
        this.frame.attach(this.window.document)
        let stream = new FrameStream('vynos').toFrame(this.frame.element)
        let client = new VynosClient(stream)

        window.onmessage = (e: any) => {
          const { data } = e

          if (!data || !data.type) {
            return
          }

          switch (data.type) {
            case 'vynos/parent/hideFull':
              this.isOpen = false
              this.frame.hideFull()
              return
            case 'vynos/parent/signupComplete':
              this.eventBus.emit('signupComplete')
              return
            case 'vynos/parent/hide':
              this.isOpen = false
              this.frame.hide()
              return
            default:
              return
          }
        }

        client.getSharedState().then(state => this.eventBus.emit('update', state.result))

        client.onSharedStateUpdate(state => {
          this.eventBus.emit('update', state)
          if (state.isTransactionPending) {
            this.display()
          }
        })
        resolve(client)
      })
    })
    return this.client
  }

  display(): void {
    this.ready()
      .then(client => client.getSharedState())
      .then(({ result: { didInit, isLocked } }) => {
        this.isOpen = true
        if (!didInit || isLocked) {
          this.frame.displayFull()
        } else {
          this.frame.display()
        }
      })
  }

  setContainerStyle(style: CSSStyleDeclaration): void {
    this.frame.setContainerStyle(style)
  }

  hide(): void {
    this.ready()
      .then(client => client.getSharedState())
      .then(({ result: { didInit, isLocked } }) => {
        this.isOpen = false
        if (!didInit || isLocked) {
          this.frame.hideFull()
        } else {
          this.frame.hide()
        }
      })
  }

  ready(): Promise<Vynos> {
    if ('serviceWorker' in navigator) {
      if (this.client) {
        return this.client
      } else {
        return this.init()
      }
    } else {
      return Promise.reject(new Error(BROWSER_NOT_SUPPORTED_TEXT))
    }
  }
}
