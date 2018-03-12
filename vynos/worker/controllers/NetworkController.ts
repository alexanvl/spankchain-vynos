import BackgroundController from './BackgroundController'
import {ProviderOpts} from 'web3-provider-engine'
import {Payload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import ProviderOptions from './ProviderOptions'
import ZeroClientProvider = require('web3-provider-engine/zero')
import Engine = require('web3-provider-engine')
import Web3 = require('web3')

const networks = require('../../networks.json')
const DEFAULT_NETWORK = 'Ropsten'

export default class NetworkController {
  private background: BackgroundController

  private provider: Engine

  private rpcUrl: string

  providerOpts: ProviderOpts

  web3: Web3

  constructor (backgroundController: BackgroundController) {
    this.background = backgroundController
    this.rpcUrl = networks[DEFAULT_NETWORK]
    this.providerOpts = new ProviderOptions(this.background, this.rpcUrl).approving()
    this.provider = ZeroClientProvider(this.providerOpts)
    this.web3 = new Web3(this.provider)
    this.handler = this.handler.bind(this)
  }

  handler (message: Payload, next: Function, end: EndFunction) {
    this.provider.sendAsync(message, (error, response) => {
      if (error) {
        end(error)
      } else {
        end(null, response)
      }
    })
  }
}
