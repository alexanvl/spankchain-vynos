import MicropaymentsController from './MicropaymentsController'
import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {
  BuyRequest,
  BuyResponse,
  CloseChannelRequest,
  CloseChannelResponse,
  ListChannelsRequest,
  ListChannelsResponse
} from '../../lib/rpc/yns'
import {PaymentChannelSerde} from 'machinomy/dist/lib/payment_channel'

export default class MicropaymentsHandler {
  controller: MicropaymentsController

  constructor (controller: MicropaymentsController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  closeChannel (message: CloseChannelRequest, next: Function, end: EndFunction) {
    let channelId = message.params[0]
    this.controller.closeChannel(channelId).then(channelId => {
      let response: CloseChannelResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: [channelId]
      }
      end(null, response)
    }).catch(end)
  }

  listChannels (message: ListChannelsRequest, next: Function, end: EndFunction) {
    this.controller.listChannels().then(channels => {
      let response: ListChannelsResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: channels.map(PaymentChannelSerde.instance.serialize)
      }
      end(null, response)
    }).catch(end)
  }

  buy (message: BuyRequest, next: Function, end: EndFunction) {
    let receiver = message.params[0]
    let amount = message.params[1]
    let gateway = message.params[2]
    let meta = message.params[3]
    let purchaseMeta = message.params[4]
    let channelValue = message.params[5]
    this.controller.buy(receiver, amount, gateway, meta, purchaseMeta, channelValue).then(vynosBuyResponse => {
      let response: BuyResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: [vynosBuyResponse]
      }
      end(null, response)
    }).catch(end)
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (CloseChannelRequest.match(message)) {
      this.closeChannel(message, next, end)
    } else if (ListChannelsRequest.match(message)) {
      this.listChannels(message, next, end)
    } else if (BuyRequest.match(message)) {
      this.buy(message, next, end)
    } else {
      next()
    }
  }
}
