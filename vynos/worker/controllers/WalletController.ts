import {Store} from 'redux'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'
import {setUsername} from '../actions'
import {SetUsernameRequest, SetIsPendingVerificationRequest, SetNeedsCollateralRequest} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'
import * as actions from '../actions'

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

  private async setNeedsCollateral (needsCollateral: boolean): Promise<void> {
    actions.setNeedsCollateral(needsCollateral)
  }

  private setIsPendingVerification (isPendingVerification: boolean): void {
    actions.setIsPendingVerification(isPendingVerification)
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, SetUsernameRequest.method, this.setUsername)
    this.registerHandler(server, SetNeedsCollateralRequest.method, this.setNeedsCollateral)
    this.registerHandler(server, SetIsPendingVerificationRequest.method, this.setIsPendingVerification)
  }
}
