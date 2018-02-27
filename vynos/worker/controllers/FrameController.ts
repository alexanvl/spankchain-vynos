import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {ToggleFrameRequest, ToggleFrameResponse} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import * as actions from '../actions'

export default class FrameController {
  private store: Store<WorkerState>

  constructor (store: Store<WorkerState>) {
    this.store = store
    this.handler = this.handler.bind(this)
  }

  public show () {
    this.store.dispatch(actions.toggleFrame(true))
  }

  public hide () {
    this.store.dispatch(actions.toggleFrame(false))
  }

  private toggleFrame (message: RequestPayload, next: Function, end: EndFunction) {
    const state = message.params[0]
    this.store.dispatch(actions.toggleFrame(state))

    const res: ToggleFrameResponse = {
      id: message.id,
      jsonrpc: message.jsonrpc,
      result: null
    }

    end(null, res)
  }

  public handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (ToggleFrameRequest.match(message)) {
      this.toggleFrame(message, next, end)
    } else {
      next()
    }
  }
}