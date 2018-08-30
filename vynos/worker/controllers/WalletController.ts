import SharedStateView from '../SharedStateView'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import {setPendingTransaction, setUsername} from '../actions'
import {SendRequest, SetUsernameRequest} from '../../lib/rpc/yns'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import Web3 = require('web3')
import Logger from '../../lib/Logger'
import validateAddress from '../../lib/validateAddress'

export default class WalletController extends AbstractController {
  private web3: any
  private store: Store<WorkerState>
  private sharedStateView: SharedStateView

  constructor (web3: any, store: Store<WorkerState>, sharedStateView: SharedStateView, logger: Logger) {
    super(logger)
    this.web3 = web3
    this.store = store
    this.sharedStateView = sharedStateView
  }

  public async setUsername (username: string) {
    this.store.dispatch(setUsername(username))
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, SetUsernameRequest.method, this.setUsername)
  }
}
