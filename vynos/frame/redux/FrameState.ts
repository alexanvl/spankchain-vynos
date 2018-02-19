import {INITIAL_SHARED_STATE, SharedState} from '../../worker/WorkerState'
import WorkerProxy from '../WorkerProxy'
import {RouterState} from 'react-router-redux'

export interface InitPageState {
  mnemonic: string|null
  showInitialDeposit: boolean
}

export interface TempState {
  workerProxy: WorkerProxy
  initPage: InitPageState
}

export interface FrameState {
  temp: TempState
  shared: SharedState
  router: RouterState
}

export function initialState(workerProxy: WorkerProxy): FrameState {
  return {
    temp: {
      initPage: {
        mnemonic: null,
        showInitialDeposit: false,
      },
      workerProxy: workerProxy
    },
    router: {
      location: null
    },
    shared: INITIAL_SHARED_STATE
  }
}
