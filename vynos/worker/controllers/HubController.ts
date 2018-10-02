import {HistoryItem, WorkerState, CurrencyType} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import SharedStateView from '../SharedStateView'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import {FetchHistoryRequest} from '../../lib/rpc/yns'
import requestJson from '../../frame/lib/request'
import debug from '../../lib/debug'
import Logger from '../../lib/Logger'
import {BasePoller} from '../../lib/poller/BasePoller'
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

export default class HubController extends AbstractController {
  private store: Store<WorkerState>
  private sharedStateView: SharedStateView
  private poller: BasePoller
  static INTERVAL_LENGTH: number = FIFTEEN_MINUTES

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView, logger: Logger) {
    super(logger)
    this.store = store
    this.sharedStateView = sharedStateView
    this.poller = new BasePoller(logger)
  }

  public start = async (): Promise<void> => {
    await this.getHubBranding()
    this.poller.start(
      this.setExchangeRate,
      HubController.INTERVAL_LENGTH,
    )
  }

  public stop = async (): Promise<void> => {
    this.poller.stop()
  }

  public fetchHistory = async (): Promise<HistoryItem[]> => {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const address = (await this.sharedStateView.getAccounts())[0]
    const history = await requestJson<HistoryItem[]>(`${hubUrl}/accounts/${address}/payments`)
    this.store.dispatch(actions.setHistory(history))
    return history
  }

  public setExchangeRate = async () => {
    const hubUrl = await this.sharedStateView.getHubUrl()

    let res
    try {
      res = await requestJson<ExchangeRateResponse>(`${hubUrl}/exchangeRate/`)
    } catch (e) {
      LOG('Failed to fetch exchange rate:', e)
      return
    }

    const BEI_RATE: string = new BigNumber('1')
      .div(constants.BOOTY.amount)
      .toFixed()

    this.store.dispatch(actions.setExchangeRates({
      [CurrencyType.USD]: '1',
      [CurrencyType.BOOTY]: '1',
      [CurrencyType.BEI]: BEI_RATE,
      [CurrencyType.ETH]: res.rates.USD,
      [CurrencyType.WEI]: new BigNumber(res.rates.USD).div('1e18').toFixed(),
      [CurrencyType.FINNEY]: new BigNumber(res.rates.USD).div(constants.FINNEY.toString()).toFixed(),
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
