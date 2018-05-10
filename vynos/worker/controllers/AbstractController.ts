import JsonRpcServer, {ErrResCallback} from '../../lib/messaging/JsonRpcServer'
import log from '../../lib/log'

const LOG = log('AbstractController')

export default class AbstractController {
  protected registerHandler(server: JsonRpcServer, method: string, func: (...args: any[]) => any) {
    server.addHandler(method, async (cb: ErrResCallback, ...args: any[]) => {
      let res

      try {
        LOG.debug('Attempting call {method}', {
          method
        })
        res = func.apply(this, args)

        if (typeof res !== 'undefined' && res.then) {
          res = await res
        }
      } catch (e) {
        LOG.error('Error has occured in {method}: {e}', {
          method,
          e
        })
        return cb(e, null)
      }

      cb(null, typeof res === 'undefined' ? null : res)
    })
  }
}
