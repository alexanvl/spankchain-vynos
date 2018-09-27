import {postJson} from '../frame/lib/request'

const API_URL = process.env.API_URL

export interface LoggerOptions {
  source: string
  method?: string
  getAddress: () => Promise<string>
}

export interface Metric {
  name: string
  ts: Date
  data: any
}

export default class Logger {
  source: string

  private getAddress: () => Promise<string>

  constructor ({source, method, getAddress}: LoggerOptions) {
    this.source = source || 'Not set'
    this.getAddress = getAddress
  }

  async logToApi (metrics: Array<Metric>) {
    if (!API_URL) {
      return
    }

    const address = await this.getAddress()

    const clonedMetrics = JSON.parse(JSON.stringify(metrics))
    clonedMetrics.forEach((m: Metric) => m.data.address = address)

    const body = JSON.stringify({
      metrics: clonedMetrics
    })

    return postJson(`${API_URL}/metrics/store`, body)
  }
}
