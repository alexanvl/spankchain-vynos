import JsonRpcServer, {ErrResCallback} from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'

export default class AbstractController {
  logger: any

  constructor (logger?: Logger) {
    this.logger = logger
  }

  protected registerHandler(server: JsonRpcServer, method: string, func: (...args: any[]) => any) {
    server.addHandler(method, async (cb: ErrResCallback, ...args: any[]) => {
      let res

      try {
        res = func.apply(this, args)

        if (typeof res !== 'undefined' && res.then) {
          res = await res
        }

        // FOR STRESS TEST ONLY
        if (this.logger) {
          this.logger.logToApi({
            metrics: [{
              name: `${this.logger.source}:${method}`,
              ts: new Date(),
              data: {
                message: `Attempting ${method}`,
                type: 'info',
              }
            }]
          })
        }
      } catch (e) {
        if (this.logger) {
          this.logger.logToApi({
            metrics: [{
              name: `${this.logger.source}:${method}`,
              ts: new Date(),
              data: {
                message: `Error has occurred in ${method}: ${e.message || e}`,
                type: 'error',
                stack: e.stack || e,
              }
            }]
          })
        }
        return cb(e, null)
      }

      cb(null, typeof res === 'undefined' ? null : res)
    })
  }
}
