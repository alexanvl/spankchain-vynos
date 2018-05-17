import requestJson from '../frame/lib/request'
import SharedStateView from '../worker/SharedStateView'

const API_URL = process.env.API_URL

export interface LoggerOptions {
  source: string
  method?: string
  address?: string
  sharedStateView?: SharedStateView
}

export default class Logger {
  source: string

  method?: string

  private address?: string

  private sharedStateView?: SharedStateView

  constructor ({source, method, address, sharedStateView}: LoggerOptions) {
    this.source = source || 'Not set'
    this.method = method || 'Not set'
    this.address = address
    this.sharedStateView = sharedStateView
  }

  setMethod (method: string): void {
    this.method = method
  }

  async logToApi (metrics: Array<{ name: string, ts: Date, data: any }>) {
    if (!API_URL || !this.sharedStateView) {
      return
    }

    if ((!this.address || !this.address.length) && this.sharedStateView) {
      const addresses = await this.sharedStateView.getAccounts()
      this.address = addresses[0]
    }

    const body = JSON.stringify({
      metrics
    })

    return requestJson(`${API_URL}/metrics/store`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }
}
