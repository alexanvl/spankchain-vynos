import JsonRpcServer, {ErrResCallback} from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'

export default abstract class AbstractController {
  public logger: Logger

  private handlers: string[] = []

  private server: JsonRpcServer|null = null

  constructor (logger: Logger) {
    this.logger = logger
  }

  abstract start (): Promise<void>

  async stop (): Promise<void> {
    this.unregisterAllHandlers()
  }

  protected registerHandler (server: JsonRpcServer, method: string, func: (...args: any[]) => any) {
    this.server = server
    server.addHandler(method, async (cb: ErrResCallback, ...args: any[]) => {
      let res

      try {
        res = func.apply(this, args)

        if (typeof res !== 'undefined' && res.then) {
          res = await res
        }
      } catch (e) {
        this.logToApi(method,{
          message: `Error has occurred in ${method}: ${e.message || e}`,
          type: 'error',
          stack: e.stack || e
        })
        return cb(e, null)
      }

      cb(null, typeof res === 'undefined' ? null : res)
    })
    this.handlers.push(method)
  }

  protected unregisterAllHandlers() {
    if (!this.server) {
      throw new Error('No JsonRpcServer instance!')
    }

    this.handlers.forEach((h: string) => this.server!.removeHandler(h))
  }

  protected logToApi(method: string, data: any) {
    this.logger.logToApi([{
      name: `${this.logger.source}:${method}`,
      ts: new Date(),
      data
    }])
  }
}
