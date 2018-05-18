import {EventEmitter} from 'events'
import {JSONRPC, randomId} from '../Payload'
import JsonRpcError from './JsonRpcError'
import {Listenable} from './Listenable'
import debug from '../debug'
import {Postable} from './Postable'
import Logger from '../Logger'

interface Validator {
  [k: string]: (f: any) => boolean
}

const FIELD_VALIDATORS: Validator = {
  id: (id: any) => typeof id === 'number',
  jsonrpc: (v: any) => v === JSONRPC,
  result: (v: any) => typeof v !== undefined
}

const FIELDS = Object.keys(FIELD_VALIDATORS)

export default class JsonRpcClient extends EventEmitter {
  private target: any

  private receiver: Listenable

  private origin: string

  private log: Logger

  constructor (name: string, target: Postable, receiver: Listenable, origin: string) {
    super()
    this.log = new Logger({
      source: 'JsonRpcClient'
    })
    this.target = target
    this.receiver = receiver
    this.origin = origin

    this.onMessage = this.onMessage.bind(this)
    this.receiver.addEventListener('message', this.onMessage)
  }

  public onMessage (e: any) {
    this.log.setMethod('onMessage')
    const data = e.data

    if (e.origin !== this.origin) {
      this.sendLogToApi({
        message: `Received message from invalid origin ${e.origin}`,
        type: 'error',
      })
      return
    }

    if (!this.validateBroadcastPayload(data)) {
      this.sendLogToApi({
        message: `Received invalid broadcast payload: ${JSON.stringify(data)}`,
        type: 'error',
      })
      return
    }

    this.sendLogToApi({
      message: `Received broadcast: ${JSON.stringify(data)}`,
      type: 'info',
    })
    this.emit(data.type.replace('broadcast/', ''), ...data.data)
  }

  public call<T>(method: string, ...params: any[]): Promise<T> {
    return this.callWithTimeout(600000, method, ...params)
  }

  public callWithTimeout<T>(timeout: number, method: string, ...params: any[]): Promise<T> {
    this.log.setMethod('callWithTimeout')
    return new Promise<T>((resolve, reject) => {
      const channel = new MessageChannel()
      const timer = setTimeout(() => reject(new Error(`Timed out. Method: ${method}`)), timeout)
      const id = randomId()

      const payload = {
        id,
        jsonrpc: JSONRPC,
        method,
        params
      }

      this.sendLogToApi({
        message: `Sending method call: ${JSON.stringify(payload)}`,
        type: 'info',
      })

      if (this.target instanceof ServiceWorker) {
        this.target.postMessage(payload, [channel.port2])
      } else {
        this.target.postMessage(payload, this.origin, [channel.port2])
      }

      channel.port1.onmessage = (e: any) => {
        const data = e.data

        this.sendLogToApi({
          message: `Received method call response: ${JSON.stringify(data)}`,
          type: 'info',
        })

        if (!this.validateRpcPayload(data)) {
          return
        }

        if (data.id !== id) {
          return
        }

        clearTimeout(timer)

        if (data.error) {
          return reject(new JsonRpcError(data.error.message, data.error.code))
        }

        resolve(data.result)
      }
    })
  }

  private validateRpcPayload (data: any): boolean {
    if (typeof data !== 'object') {
      return false
    }

    for (let i = 0; i < FIELDS.length; i++) {
      const field = FIELDS[i]
      const validator = FIELD_VALIDATORS[field]
      const value = data[field]

      if (!validator(value)) {
        return false
      }
    }

    return true
  }

  private validateBroadcastPayload (data: any) {
    return typeof data.type === 'string' &&
      data.type.indexOf('broadcast/') === 0 &&
      Array.isArray(data.data)
  }

  private sendLogToApi (data: any) {
    this.log.logToApi([{
      name: `${this.log.source}:${this.log.method}`,
      ts: new Date(),
      data,
    }])
  }
}
