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
      } catch (e) {
        if (this.logger) {
          this.logger.logToHub({
            message: `Error has occurred in ${method}: ${e}`,
            type: 'error'
          })
        }
        return cb(e, null)
      }

      cb(null, typeof res === 'undefined' ? null : res)
    })
  }
}
