import {EventEmitter} from 'events'
import {JSONRPC} from '../Payload'
import OriginValidator, {AllowedOrigins} from './OriginValidator'
import {Postable} from './Postable'
import debug from '../debug'
import {Listenable} from './Listenable'
import Logger from '../Logger'

const METHOD_NOT_FOUND = -32601

export type ErrResCallback = (err: any, res: any) => void

export type Handler = (cb: ErrResCallback, ...args: any[]) => void

interface Validator {
  [k: string]: (f: any) => boolean
}

const FIELD_VALIDATORS: Validator = {
  id: (id: any) => typeof id === 'number',
  jsonrpc: (v: any) => v === JSONRPC,
  method: (v: any) => typeof v === 'string' && v.length > 0,
  params: (v: any) => Array.isArray(v)
}

const FIELDS = Object.keys(FIELD_VALIDATORS)

export default class JsonRpcServer extends EventEmitter {
  private originValidator: OriginValidator

  private handlers: { [k: string]: Handler } = {}

  private source: Listenable

  private target: Postable

  private name: string

  private log: Logger

  constructor (name: string, allowedOrigins: AllowedOrigins, source: Listenable, target: Postable) {
    super()
    this.originValidator = new OriginValidator(allowedOrigins)
    this.source = source
    this.target = target
    this.log = new Logger({
      source: 'JsonRpcServer'
    })
    this.name = `JsonRpcServer:${name}`
    this.onMessage = this.onMessage.bind(this)
    this.source.addEventListener('message', this.onMessage)
  }

  public async stop (): Promise<void> {
    this.source.removeEventListener('message', this.onMessage)
  }

  public broadcast(type: string, ...data: any[]) {
    this.log.setMethod('broadcast')
    this.sendLogToApi({
      message: `Broadcasting type: ${type}`,
      type: 'info',
    })

    if ('WindowClient' in window && (this.target as any).isWrapper) {
      this.target.postMessage({
        type: `broadcast/${type}`,
        data
      })
    } else {
      this.target.postMessage({
        type: `broadcast/${type}`,
        data
      }, '*')
    }
  }

  public addHandler(name: string, handler: Handler) {
    if (this.handlers[name]) {
      throw new Error(`Handler ${name} already added.`)
    }

    this.handlers[name] = handler
  }

  public findHandler(method: string): Handler|undefined {
    return this.handlers[method]
  }

  private onMessage (e: any) {
    this.log.setMethod('onMessage')
    const data = e.data

    let origin = e.origin

    // Firefox doesn't set the origin for some reason. See https://bugzilla.mozilla.org/show_bug.cgi?id=1448740
    if (!origin || !origin.length) {
      const sourceLoc = e.source.url
      const parts = sourceLoc.split('/')
      origin = `${parts[0]}//${parts[2]}`
    }

    if (!this.originValidator.isAllowed(origin)) {
      this.sendLogToApi({
        message: `Received message from non-whitelisted origin ${origin}`,
        type: 'error',
      })
      return
    }

    if (!this.validateRpcPayload(data)) {
      this.sendLogToApi({
        message: `Received invalid RPC payload: ${JSON.stringify(data)}`,
        type: 'error',
      })
      return
    }

    this.sendLogToApi({
      message: `Received message: ${JSON.stringify(data)}`,
      type: 'error',
    })
    const handler = this.findHandler(data.method)

    if (!handler) {
      this.sendLogToApi({
        message: `No handler found for method ${data.method}`,
        type: 'error',
      })
      return this.sendErrorResponse(e, METHOD_NOT_FOUND, `Method ${data.method} not found.`)
    }

    handler((err: any, res: any) => {
      if (err) {
        this.sendLogToApi({
          message: `Handler returned an error for method ${data.method}: ${data.err}`,
          type: 'error',
        })
        return this.sendErrorResponse(e, err.code || -1, err.message || 'An error occurred.')
      }

      this.sendLogToApi({
          message: `Returning response for method ${data.method}`,
          type: 'info',
        })
      return this.sendResponse(e, res)
    }, ...data.params)
  }

  private sendErrorResponse(e: any, code: number, message: string) {
    const { jsonrpc, id } = e.data

    e.ports[0].postMessage({
      id,
      jsonrpc,
      error: {
        code,
        message
      }
    })
  }

  private sendResponse(e: any, result: any) {
    const { jsonrpc, id } = e.data

    e.ports[0].postMessage({
      id,
      jsonrpc,
      result
    })
  }

  private validateRpcPayload (data: any): boolean {
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

  private sendLogToApi (data: any) {
    this.log.logToApi([{
      name: `${this.log.source}:${this.log.method}`,
      ts: new Date(),
      data,
    }])
  }
}
