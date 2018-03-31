import {WorkerState} from '../worker/WorkerState'
import {Store} from 'redux'

export default class AuthStateMachine {
  private store: Store<WorkerState>

  private authRealm: string

  private resolve: () => void

  private reject: () => void

  private prevState: WorkerState


  constructor (store: Store<WorkerState>, authRealm: string) {
    this.store = store
    this.authRealm = authRealm
    this.receiveState = this.receiveState.bind(this)
  }

  public async awaitAuthorization () {
    let unsub: () => void

    const state = this.store.getState()

    this.prevState = state

    if (state.persistent.authorizedHubs[state.runtime.currentHubUrl]) {
      return
    }

    await new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
      unsub = this.store.subscribe(this.receiveState)
    })

    unsub!()
  }

  private receiveState () {
    const prevState = this.prevState
    const nextState = this.store.getState()
    const hubUrl = nextState.runtime.currentHubUrl

    if (prevState.persistent.authorizedHubs === nextState.persistent.authorizedHubs &&
      prevState.runtime.authorizationRequest === prevState.runtime.authorizationRequest) {
      this.prevState = nextState
      return
    }

    return nextState.persistent.authorizedHubs[hubUrl] ?
      this.resolve() :
      this.reject()
  }
}
