import {IConnext, LedgerChannel, VirtualChannel} from './ConnextTypes'
import getVirtualChannels from '../getVirtualChannels'
import {aggregateVCAndLCBalances} from '../aggregateVCBalances'
import {Store} from 'redux'
import {WorkerState, ChannelState} from '../../worker/WorkerState'
import currencyAsJSON from '../currency/currencyAsJSON'
import getAddress from '../getAddress' 

export default async function getChannels(connext: IConnext, store: Store<WorkerState>): Promise<ChannelState|null> {
  if (!getAddress(store)) {
    return null
  }

  const lc: LedgerChannel = await connext.getChannelByPartyA()
  if (!lc) {
    return null
  }

  const vcs: VirtualChannel[] = await getVirtualChannels(lc.channelId)

  const isBootySupport = !!store.getState().runtime.featureFlags.bootySupport

  const aggregate = aggregateVCAndLCBalances(
    store.getState().runtime.wallet!.getAddressString(),
    vcs,
    lc,
    isBootySupport,
  )

  return {
    lc,
    ledgerId: lc.channelId,
    currentVCs: vcs,
    balances: {
      ethBalance: currencyAsJSON(aggregate.ethBalance),
      tokenBalance: currencyAsJSON(aggregate.tokenBalance),
    }
  }
}
