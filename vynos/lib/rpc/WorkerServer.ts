import JsonRpcServer, {ErrResCallback} from '../messaging/JsonRpcServer'
import Engine = require('web3-provider-engine')
import Web3 = require('web3')

import {ProviderOpts} from 'web3-provider-engine'
import BackgroundController from '../../worker/controllers/BackgroundController'
import ProviderOptions from '../../worker/controllers/ProviderOptions'
import {Handler} from 'express'
import {JSONRPC, randomId} from '../Payload'
import {Listenable} from '../messaging/Listenable'

const networks = require('../../networks.json')
const DEFAULT_NETWORK = 'ropsten'

import ClientProvider from '../web3/ClientProvider';

export default class WorkerServer extends JsonRpcServer {
  private provider: Engine

  providerOpts: ProviderOpts

  web3: Web3

  constructor (backgroundController: BackgroundController, source: Listenable, target: WindowClient) {
    super('WorkerServer', [ process.env.FRAME_URL as string ], source, target)
    this.providerOpts = new ProviderOptions(backgroundController, networks[process.env.NETWORK_NAME || DEFAULT_NETWORK]).approving()
    this.provider = ClientProvider(this.providerOpts)
    this.web3 = new Web3(this.provider)
  }

  public findHandler (method: string): Handler | any {
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
