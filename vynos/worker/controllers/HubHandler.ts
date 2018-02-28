import HubController from './HubController'
import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {InitializeRequest, InitializeResponse} from '../../lib/rpc/yns'

export default class HubHandler {
  controller: HubController

  constructor (controller: HubController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  initializeHub (message: InitializeRequest, next: Function, end: EndFunction) {
    this.controller.initialize(message.params[0], message.params[1])
      .then(() => {
        const response: InitializeResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: true
        }

        end(null, response)
      }).catch(end)
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (InitializeRequest.match(message)) {
      this.initializeHub(message, next, end)
    } else {
      next()
    }
  }
}
