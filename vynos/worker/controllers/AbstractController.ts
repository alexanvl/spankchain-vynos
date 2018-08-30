import JsonRpcServer, {ErrResCallback} from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'

export default class AbstractController {
  logger: Logger

  constructor (logger: Logger) {
    this.logger = logger
  }

  protected registerHandler (server: JsonRpcServer, method: string, func: (...args: any[]) => any) {
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
  }

  protected logToApi(method: string, data: any) {
    this.logger.logToApi([{
      name: `${this.logger.source}:${method}`,
      ts: new Date(),
      data
    }])
  }
}
