import { Store } from 'redux'
import { WorkerState } from '../worker/WorkerState'

export default function getAddress (store: Store<WorkerState>): string {
  debugger
  return store.getState().runtime.wallet!.getAddressString()
}
