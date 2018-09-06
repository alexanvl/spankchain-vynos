import {HistoryItem, WorkerState, CurrencyType} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import SharedStateView from '../SharedStateView'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import {FetchHistoryRequest} from '../../lib/rpc/yns'
import requestJson from '../../frame/lib/request'
import {LifecycleAware} from './LifecycleAware'
import debug from '../../lib/debug'
import Logger from '../../lib/Logger'
import Poller from '../../lib/Poller'
import BigNumber from 'bignumber.js'
import * as constants from '../../lib/constants'

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

const FIFTEEN_MINUTES = 15 * 60 * 1000

export default class HubController extends AbstractController implements LifecycleAware {
  private store: Store<WorkerState>
  private sharedStateView: SharedStateView
  private poller: Poller
  static INTERVAL_LENGTH: number = FIFTEEN_MINUTES

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView, logger: Logger) {
    super(logger)
    this.store = store
    this.sharedStateView = sharedStateView
    this.poller = new Poller(logger)
  }

  public start = async (): Promise<void> => {
    await this.getHubBranding()
    this.poller.start(
      HubController.INTERVAL_LENGTH,
      this.setExchangeRate
    )
  }

  public stop = async (): Promise<void> => {
    this.poller.stop()
  }
  public fetchHistory = async (): Promise<HistoryItem[]> => {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const address = (await this.sharedStateView.getAccounts())[0]
    const history = await requestJson<HistoryItem[]>(`${hubUrl}/accounts/${address}/payments`, {
      credentials: 'include'
    })

    this.store.dispatch(actions.setHistory(history))
    return history
  }

  public setExchangeRate = async () => {
    const hubUrl = await this.sharedStateView.getHubUrl()

    let res
    try {
      res = await requestJson<ExchangeRateResponse>(`${hubUrl}/exchangeRate/`, {
        credentials: 'include'
      })
    } catch (e) {
      LOG('Failed to fetch exchange rate:', e)
      return
    }

    const USD_RATE: string = new BigNumber(constants.ETHER.toString(10))
      .div(res.rates.USD)
      .toString(10)

    this.store.dispatch(actions.setExchangeRates({
      [CurrencyType.USD]: USD_RATE,
      [CurrencyType.ETH]: constants.ETHER.toString(10),
      [CurrencyType.WEI]: '1',
      [CurrencyType.FINNEY]: constants.FINNEY.toString(10),
    }))
  }

  private getHubBranding = async (retryCount: number = 3): Promise<null> => {
    try {
      const hubUrl = await this.sharedStateView.getHubUrl()
      const res = await requestJson<BrandingResponse>(`${hubUrl}/branding`)
      this.store.dispatch(actions.setHubBranding(res))
    } catch (e) {
      LOG(`Failed to fetch branding (${retryCount > 0 ? 'retrying' : 'not retrying'}):`, e)
      if (retryCount > 0)
        return this.getHubBranding(retryCount - 1)
      throw new Error('Error fetching branding (giving up after too many retries): ' + e)
    }

    return null
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, FetchHistoryRequest.method, this.fetchHistory)
  }
}
