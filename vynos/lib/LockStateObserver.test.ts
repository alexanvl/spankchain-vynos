import { WorkerState, INITIAL_STATE } from '../worker/WorkerState'
import * as redux from 'redux'
import {Store} from 'redux'
import reducers from '../worker/reducers'
import { expect } from 'chai'
import LockStateObserver from './LockStateObserver'

describe('LockStateObserver', () => {
  let lockStateObserver: LockStateObserver
  let store: Store<WorkerState>

  const TOGGLE_WALLET = 'TOGGLE_WALLET'
  let authToken = 0
  const createStore = (): Store<WorkerState> => {
    const _reducers = (state: WorkerState, action: any): WorkerState => {
      if (action.type === TOGGLE_WALLET) {
        return {
          ...state,
          runtime: {
            ...state.runtime,
            wallet: (!!state.runtime.wallet ? undefined: 'IS TRUTHY') as any,
            currentAuthToken: String(authToken++)
          }
        }
      }
      return reducers(state, action)
    }
    return redux.createStore(_reducers as any, INITIAL_STATE as any) as Store<WorkerState>
  }

  const toggleWallet = () => store.dispatch({type: TOGGLE_WALLET})

  beforeEach(() => {
    store = createStore()
    lockStateObserver = new LockStateObserver(store)
  })

  it('should get state from redux store', () => {
    expect(lockStateObserver.isLocked()).to.equal(true)
    toggleWallet()
    expect(lockStateObserver.isLocked()).to.equal(false)
    toggleWallet()
    expect(lockStateObserver.isLocked()).to.equal(true)
    toggleWallet()
    expect(lockStateObserver.isLocked()).to.equal(false)
  })

  it('should run lock and Unlock handlers when wallet is locked or unlocked', async () => {
    let timesRan = new Map()
    const onLock = () => {
      const value = (timesRan.get(onLock) || 0) + 1
      timesRan.set(onLock, value)
    }
    const onUnLock = () => {
      const value = (timesRan.get(onUnLock) || 0) + 1
      timesRan.set(onUnLock, value)
    }
    lockStateObserver.addLockHandler(onLock)
    lockStateObserver.addUnlockHandler(onUnLock)
    
    toggleWallet()
    expect(timesRan.get(onUnLock)).to.equal(1)
    toggleWallet()
    expect(timesRan.get(onUnLock)).to.equal(1)
    expect(timesRan.get(onLock)).to.equal(1)
    
    toggleWallet()
    expect(timesRan.get(onUnLock)).to.equal(2)
    expect(timesRan.get(onLock)).to.equal(1)
    
    toggleWallet()
    expect(timesRan.get(onUnLock)).to.equal(2)
    expect(timesRan.get(onLock)).to.equal(2)
  })
})
