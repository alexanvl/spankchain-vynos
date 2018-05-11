import {ToggleFrameRequest} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'
import SharedStateView from '../SharedStateView'

export default class FrameController extends AbstractController {
  private store: Store<WorkerState>

  private sharedStateView: SharedStateView

  constructor (store: Store<WorkerState>, sharedStateView: SharedStateView) {
    super(new Logger('FrameController', sharedStateView))
    this.store = store
    this.sharedStateView = sharedStateView
  }

  public show () {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed: true}))
  }

  public hide () {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed: false}))
  }

  private toggleFrame (isFrameDisplayed: boolean, forceRedirect: string, isPerformer?: boolean): Promise<void> {
    this.store.dispatch(actions.toggleFrame({isFrameDisplayed, forceRedirect, isPerformer}))

    // wait for the animation to complete
    return new Promise((resolve) => setTimeout(resolve, 1000))
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, ToggleFrameRequest.method, this.toggleFrame)
  }
}
