import SharedStateView from '../worker/SharedStateView'
import JsonRpcServer from './messaging/JsonRpcServer'
import requestJson from '../frame/lib/request'
import {LogToHubRequest} from './rpc/yns'
import {LoggerPayload} from './LoggerPayload'

export default class Logger {

  private sharedStateView: any

  private method: string

  constructor(method: string, sharedStateView?: SharedStateView) {
    this.sharedStateView = sharedStateView
    this.method = method
  }

  async logToHub (data: LoggerPayload) {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const addresses = await this.sharedStateView.getAccounts()
    const address = addresses[0]

    // Format message if none is set
    const message = (data.message && data.message.length) ?
      `[Worker][${this.method}] - ${data.message}` :
      `[Worker][${this.method}] - No message defined`;

    const res = await requestJson(`${hubUrl}/log/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: data.type || 'info',
        message,
        address,
        timestamp: new Date().toISOString()
      })
    })

    return res
  }
}
