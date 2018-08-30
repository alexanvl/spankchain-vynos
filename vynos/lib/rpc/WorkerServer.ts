import JsonRpcServer, {ErrResCallback} from '../messaging/JsonRpcServer'

import {JSONRPC, randomId} from '../Payload'
import {Listenable} from '../messaging/Listenable'
import Engine = require('web3-provider-engine')

export default class WorkerServer extends JsonRpcServer {
  private readonly provider: Engine

  constructor (provider: Engine, source: Listenable, target: WindowClient) {
    super('WorkerServer', [process.env.FRAME_URL as string], source, target)
    this.provider = provider
  }

  public findHandler (method: string): any {
    if (method.indexOf('eth_') === 0) {
      return (cb: ErrResCallback, ...params: any[]) => {
        return this.provider.sendAsync({
          id: randomId(),
          method,
          jsonrpc: JSONRPC,
          params
        }, cb)
      }
    }

    return super.findHandler(method)
  }
}
