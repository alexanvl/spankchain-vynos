import {Store} from 'redux'
import {WorkerState} from '../WorkerState'
import * as actions from '../actions'
import {BrandingResponse} from './HubController'

export default class StartupController {
  private store: Store<WorkerState>

  constructor (store: Store<WorkerState>) {
    this.store = store
  }

  public async registerHub (hubUrl: string, authRealm: string) {
    this.setCurrentHubUrl(hubUrl)
    this.setAuthRealm(authRealm)
    await this.getHubBranding(hubUrl)
  }

  private setCurrentHubUrl (hubUrl: string) {
    this.store.dispatch(actions.setCurrentHubUrl(hubUrl))
  }

  private setAuthRealm (authRealm: string) {
    this.store.dispatch(actions.setCurrentAuthRealm(authRealm))
  }

  private async getHubBranding (hubUrl: string): Promise<null> {
    const res = await fetch(`${hubUrl}/branding`)

    if (res.status !== 200) {
      throw new Error('Failed to get hub branding.')
    }

    const resJson: BrandingResponse = await res.json()
    this.store.dispatch(actions.setHubBranding(resJson))
    return null
  }
}
