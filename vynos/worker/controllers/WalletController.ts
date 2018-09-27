import {Store} from 'redux'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'
import {setUsername} from '../actions'
import {SetUsernameRequest} from '../../lib/rpc/yns'
import SharedStateView from '../SharedStateView'
import {WorkerState} from '../WorkerState'

export default class WalletController extends AbstractController {
  private store: Store<WorkerState>

  constructor (web3: any, store: Store<WorkerState>, logger: Logger) {
    super(logger)
    this.store = store
  }

  async start (): Promise<void> {
    // noop
  }

  public async setUsername (username: string) {
    this.store.dispatch(setUsername(username))
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, SetUsernameRequest.method, this.setUsername)
  }
}
