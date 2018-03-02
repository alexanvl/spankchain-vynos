import {HistoryItem, SharedState, WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import SharedStateView from '../SharedStateView'

export interface BrandingResponse {
  title?: string
  companyName?: string
  username?: string
  backgroundColor?: string
  textColor?: string
  address: string
}

export default class HubController {
  store: Store<WorkerState>

  sharedStateView: SharedStateView

  hubUrl: string

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView) {
    this.store = store
    this.sharedStateView = sharedStateView
  }

  initialize (hubUrl: string, authRealm: string): Promise<null> {
    this.hubUrl = hubUrl
    this.setCurrentHubUrl(hubUrl)
    this.setAuthRealm(authRealm)
    return this.getHubBranding()
  }

  setCurrentHubUrl (hubUrl: string) {
    this.store.dispatch(actions.setCurrentHubUrl(hubUrl))
  }

  setAuthRealm (authRealm: string) {
    this.store.dispatch(actions.setCurrentAuthRealm(authRealm))
  }

  async fetchHistory(): Promise<HistoryItem[]> {
    const hubUrl = await this.sharedStateView.getHubUrl()
    const address = (await this.sharedStateView.getAccounts())[0]
    const res = await fetch(`${hubUrl}/payments/${address}`, {
      credentials: 'include'
    })
    const history = await res.json()
    this.store.dispatch(actions.setHistory(history))
    return history
  }

  async getHubBranding (): Promise<null> {
    const res = await fetch(`${this.hubUrl}/branding`)
    const resJson: BrandingResponse = await res.json()
    this.store.dispatch(actions.setHubBranding(resJson))
    return null
  }
}
