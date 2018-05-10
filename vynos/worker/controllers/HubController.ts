import {HistoryItem, WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import SharedStateView from '../SharedStateView'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import {FetchHistoryRequest} from '../../lib/rpc/yns'
import requestJson from '../../frame/lib/request'
import {LifecycleAware} from './LifecycleAware'
import debug from '../../lib/debug'
import log from '../../lib/log'

export interface BrandingResponse {
  title?: string
  companyName?: string
  username?: string
  backgroundColor?: string
  textColor?: string
  address: string
}

export interface ExchangeRateResponse {
  id: string
  retrievedAt: string
  rates: {
    USD: string
  }
}

const LOG = debug('HubController')

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export default class HubController extends AbstractController implements LifecycleAware {
  private store: Store<WorkerState>

  private sharedStateView: SharedStateView

  private isPolling: boolean = false

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView) {
    super()
    this.store = store
    this.sharedStateView = sharedStateView
  }

  async start (): Promise<void> {
    this.isPolling = true
    this.pollExchangeRate()
  }

  async stop (): Promise<void> {
    this.isPolling = false
  }

  async fetchHistory (): Promise<HistoryItem[]> {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const address = (await this.sharedStateView.getAccounts())[0]
    const history = await requestJson<HistoryItem[]>(`${hubUrl}/accounts/${address}/payments`, {
      credentials: 'include'
    })

    this.store.dispatch(actions.setHistory(history))
    return history
  }

  async pollExchangeRate() {
    const hubUrl = await this.sharedStateView.getHubUrl()

    const poll = async () => {
      if (!this.isPolling) {
        return
      }

      let res

      try {
        res = await requestJson<ExchangeRateResponse>(`${hubUrl}/exchangeRate/`, {
          credentials: 'include'
        })
      } catch (e) {
        LOG('Failed to fetch exchange rate:', e)
        return
      }

      this.store.dispatch(actions.setExchangeRate(res.rates.USD))

      setTimeout(poll, FIFTEEN_MINUTES)
    }

    this.isPolling = true
    poll()
  }

  registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, FetchHistoryRequest.method, this.fetchHistory)
  }
}
