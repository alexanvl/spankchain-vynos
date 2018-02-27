import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'

export interface BrandingResponse {
  cardName: string
  cardImageUrl: string
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

  getHubBranding (): Promise<null> {
    return fetch(`${this.hubUrl}/branding`)
      .then((res) => res.json())
      .then((res: BrandingResponse) => this.store.dispatch(actions.setHubBranding({
        hubUrl: this.hubUrl,
        ...res
      }))).then(() => null)
  }
}
