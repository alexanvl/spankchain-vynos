import JsonRpcServer from './messaging/JsonRpcServer'
import requestJson from '../frame/lib/request'
import {LoggerPayload} from './LoggerPayload'
import SharedStateView from '../worker/SharedStateView';

export default class Logger {

  private method: string

  private source: string

  private hubUrl?: string

  private address?: string

  private sharedStateView?: SharedStateView

  constructor({ source, method, hubUrl, address, sharedStateView } :
    { source: string, method: string, hubUrl?: string, address?: string, sharedStateView?: SharedStateView }) {
    this.source = source || 'Not set'
    this.method = method || 'Not set'
    this.hubUrl = hubUrl
    this.address = address
    this.sharedStateView = sharedStateView
  }

  async logToHub (data: LoggerPayload) {
    if (!this.hubUrl && !this.sharedStateView) {
      return
    }

    const {message, type, stack} = data

    if ((!this.hubUrl || !this.hubUrl.length) && this.sharedStateView) {
      this.hubUrl = await this.sharedStateView.getHubUrl()
    }

    if ((!this.address || !this.address.length) && this.sharedStateView) {
      const addresses = await this.sharedStateView.getAccounts()
      this.address = addresses[0]
    }

    // Format message if none is set
    const formattedMessage = (message && message.length) ?
      `[${this.source}][${this.method}] - ${message}` :
      `[${this.source}][${this.method}] - No message defined`;

    const body = {
      type: type || 'info',
      message: formattedMessage,
      address: this.address,
      timestamp: new Date().toISOString()
    } as any

    if (stack && stack.length) {
      body.stack = stack
    }

    return requestJson(`${this.hubUrl}/log/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }
}
