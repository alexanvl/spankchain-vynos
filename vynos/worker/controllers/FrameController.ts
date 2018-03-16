import {ToggleFrameRequest} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'

export default class FrameController extends AbstractController {
  private store: Store<WorkerState>

  constructor (store: Store<WorkerState>) {
    super()
    this.store = store
  }

  public show () {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed: true}))
  }

  public hide () {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed: false}))
  }

  private toggleFrame (isFrameDisplayed: boolean, forceRedirect: string) {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed, forceRedirect}))
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, ToggleFrameRequest.method, this.toggleFrame)
  }
}
