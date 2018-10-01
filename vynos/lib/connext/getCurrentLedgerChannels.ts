import { Store } from 'redux'
import { WorkerState } from '../../worker/WorkerState'
import getAddress from '../getAddress'
import {LedgerChannel} from './ConnextTypes'

export default async function getCurrentLedgerChannels (connext: any, store: Store<WorkerState>, state?: string): Promise<LedgerChannel[] | null> {
  let lcs

  try {
    lcs = await connext.getChannelByPartyA(getAddress(store), state || null) as LedgerChannel[]|LedgerChannel|null
  } catch (e) {
    if (e.status === 404) {
      return null
    }
    throw e
  }

  if (!lcs) {
    return null
  }

  if (Array.isArray(lcs)) {
    return lcs.length ? lcs : null
  }

  return [lcs]
}
