import NotificationController from "./NotificationController"
import { EndFunction } from "../../lib/StreamServer"
import { JSONRPC, RequestPayload } from "../../lib/Payload"
import {Writable} from 'readable-stream'
import {
  WatchWalletBalanceRequest, WatchWalletBalanceResponse
} from '../../lib/rpc/yns'

export default class NotificationHandler {
  controller: NotificationController

  constructor(controller: NotificationController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  public async watchWalletBalance (message: WatchWalletBalanceRequest, next: Function, end: EndFunction) {
    try {
      await this.controller.watchWalletBalance()
    } catch (e) {
      end(e)
      return
    }

    const result: WatchWalletBalanceResponse = {
      id: message.id,
      jsonrpc: message.jsonrpc,
      result: null
    }

    end(null, result)
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (WatchWalletBalanceRequest.match(message)) {
      this.watchWalletBalance(message, next, end)
    } else {
      next()
    }
  }
}
