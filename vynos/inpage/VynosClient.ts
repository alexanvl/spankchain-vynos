import {
  AuthenticateRequest,
  AuthenticateResponse,
  BuyRequest,
  GetSharedStateRequest,
  InitAccountRequest,
  LockWalletRequest, SetNeedsCollateralRequest, SetIsPendingVerificationRequest,
  SetUsernameRequest,
  StatusRequest,
  ToggleFrameRequest
} from '../lib/rpc/yns'
import VynosBuyResponse from '../lib/VynosBuyResponse'
import {SharedState} from '../worker/WorkerState'
import JsonRpcClient from '../lib/messaging/JsonRpcClient'
import {SharedStateBroadcastEvent} from '../lib/rpc/SharedStateBroadcast'
import {ResetBroadcastEvent} from '../lib/rpc/ResetBroadcast'
import {logMetrics} from '../lib/metrics'
import {WorkerStatus} from '../lib/rpc/WorkerStatus'
import {ReadyBroadcastEvent} from '../lib/rpc/ReadyBroadcast'
import wait from '../lib/wait'
import {VynosPayment, VynosPurchase} from '../lib/VynosPurchase'
import {PurchaseMetaType} from '../lib/connext/ConnextTypes'

export default class VynosClient extends JsonRpcClient {
  constructor (target: Window, origin: string) {
    super('VynosClient', target, window, origin)
    this.onReset = this.onReset.bind(this)
    this.on(ResetBroadcastEvent, this.onReset)
    this.on('__METRICS__', logMetrics)
  }

  onReset () {
    window.location.reload()
  }

  async initialize (): Promise<boolean> {
    const status = await this.statusWithRetry()

    if (status !== WorkerStatus.READY) {
      await new Promise((resolve) => this.once(ReadyBroadcastEvent, resolve))
    }

    return true
  }

  initAccount (): Promise<void> {
    return this.call(InitAccountRequest.method)
  }

  buy (purchase: VynosPurchase<any>): Promise<VynosBuyResponse> {
    return this.call(BuyRequest.method, purchase)
  }

  getSharedState (): Promise<SharedState> {
    return this.call(GetSharedStateRequest.method)
  }

  onSharedStateUpdate (fn: (state: SharedState) => void): void {
    this.addListener(SharedStateBroadcastEvent, (state: SharedState) => fn(state))
  }

  authenticate (): Promise<AuthenticateResponse> {
    return this.call(AuthenticateRequest.method, window.location.hostname)
  }

  toggleFrame (state: boolean, forceRedirect?: string, isPerformer?: boolean): Promise<void> {
    return this.call(ToggleFrameRequest.method, state, forceRedirect, isPerformer)
  }

  lock (): Promise<void> {
    return this.call(LockWalletRequest.method)
  }

  setUsername (username: string): Promise<void> {
    return this.call(SetUsernameRequest.method, username)
  }

  setNeedsCollateral (needsCollateral: boolean): Promise<void> {
    return this.call(SetNeedsCollateralRequest.method, needsCollateral);
  }

  setIsPendingVerification (isPendingVerification: boolean): Promise<void> {
    return this.call(SetIsPendingVerificationRequest.method, isPendingVerification)
  }

  private async statusWithRetry (): Promise<WorkerStatus> {
    let retryCount = 5
    let retry = 0

    while (retry < retryCount) {
      const start = Date.now()

      try {
        const res = await this.callWithTimeout<WorkerStatus>(5000, StatusRequest.method)

        logMetrics([{
          name: 'vynos:clientStatusRetryCount',
          ts: new Date(),
          data: {
            retryCount: retry
          }
        }])

        return res
      } catch (e) {
        const elapsed = Date.now() - start

        if (elapsed < 5000) {
          await wait(5000 - elapsed)
        }

        retry++
      }
    }

    throw new Error('Status call timed out.')
  }
}
