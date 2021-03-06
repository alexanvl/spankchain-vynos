import {Store} from 'redux'
import {WorkerState} from '../worker/WorkerState'

export default class LockStateObserver {
  private store: Store<WorkerState>
  private onLockHandlers: Function[] = []
  private onUnlockHandlers: Function[] = []

  constructor (store: Store<WorkerState>) {
    this.store = store
    this.subscribe()
  }

  public addLockHandler = (cb: Function): void => {
    this.onLockHandlers.push(cb)
  }

  public addUnlockHandler = (cb: Function): void => {
    this.onUnlockHandlers.push(cb)
  }

  public isLocked = (): boolean => !this.store.getState().runtime.wallet

  private onLock = (): void => this.onLockHandlers.forEach(handler => handler())
  private onUnlock = (): void => this.onUnlockHandlers.forEach(handler => handler())

  private subscribe = (): void => {
    let wasLocked = true
    let prevAuthToken = ''
    this.store.subscribe((): void => {
      const isLocked = this.isLocked()
      const authToken = this.store.getState().runtime.currentAuthToken

      if (isLocked === wasLocked) {
        return
      }
      if (!isLocked && authToken === prevAuthToken) {
        return
      }

      wasLocked = isLocked
      prevAuthToken = authToken
      isLocked
        ? this.onLock()
        : this.onUnlock()
    })
  }
}
