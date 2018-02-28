import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'

export interface BrandingResponse {
  title?: string
  companyName?: string
  username?: string
  backgroundColor?: string
  textColor?: string
}

export default class HubController {
  store: Store<WorkerState>

  hubUrl: string

  constructor (store: Store<WorkerState>) {
    this.store = store
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

  async getHubBranding (): Promise<null> {
    const res = await fetch(`${this.hubUrl}/branding`)
    const resJson: BrandingResponse = await res.json()
    this.store.dispatch(actions.setHubBranding(resJson))
    return null
  }
}
