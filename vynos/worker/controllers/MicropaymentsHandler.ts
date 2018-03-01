import MicropaymentsController from './MicropaymentsController'
import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {
  BuyRequest,
  BuyResponse,
  CloseChannelRequest,
  CloseChannelResponse,
  ListChannelsRequest,
  ListChannelsResponse, OpenChannelRequest, OpenChannelResponse, PopulateChannelsRequest, PopulateChannelsResponse
} from '../../lib/rpc/yns'
import {PaymentChannelSerde} from 'machinomy/dist/lib/payment_channel'

export default class MicropaymentsHandler {
  controller: MicropaymentsController

  constructor (controller: MicropaymentsController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  async populateChannels(message: PopulateChannelsRequest, next: Function, end: EndFunction) {
    try {
      await this.controller.populateChannels()

      const response: PopulateChannelsResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: null
      }

      end(null, response)
    } catch (e) {
      end(e)
    }
  }

  async openChannel (message: OpenChannelRequest, next: Function, end: EndFunction) {
    const receiver = message.params[0]
    const value = message.params[1]

    let chan

    try {
      chan = await this.controller.openChannel(receiver, value)
    } catch (e) {
      end(e)
      return
    }

    const res: OpenChannelResponse = {
      id: message.id,
      jsonrpc: message.jsonrpc,
      result: chan.channelId
    }

    end(null, res)
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
    const price = message.params[0]
    const meta = message.params[1]
    this.controller.buy(price, meta).then(vynosBuyResponse => {
      let response: BuyResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: vynosBuyResponse
      }
      end(null, response)
    }).catch(end)
  }

  handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (PopulateChannelsRequest.match(message)) {
      this.populateChannels(message, next, end)
    } else if (OpenChannelRequest.match(message)) {
      this.openChannel(message, next, end)
    } else if (CloseChannelRequest.match(message)) {
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
