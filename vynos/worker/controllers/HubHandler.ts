import HubController from './HubController'
import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {AuthenticateRequest, AuthenticateResponse, InitializeRequest, InitializeResponse} from '../../lib/rpc/yns'

export default class HubHandler {
  controller: HubController

  constructor (controller: HubController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  initializeHub (message: InitializeRequest, next: Function, end: EndFunction) {
    this.controller.initialize(message.params[0])
      .then(() => this.controller.getHubBranding())
      .then(() => {
        const response: InitializeResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: true
        }

        end(null, response)
      }).catch(end)
  }

  authenticate (message: AuthenticateRequest, next: Function, end: EndFunction) {
    this.controller.authenticate(message.params[0]).then((token: string) => {
      const response: AuthenticateResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          success: true,
          token
        }
      }

      end(null, response)
    }).catch(end)
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (InitializeRequest.match(message)) {
      this.initializeHub(message, next, end)
    } else if (AuthenticateRequest.match(message)) {
      this.authenticate(message, next, end)
    } else {
      next()
    }
  }
}
