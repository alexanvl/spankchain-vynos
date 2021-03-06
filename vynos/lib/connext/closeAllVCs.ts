import {Store} from 'redux'
import {WorkerState} from '../../worker/WorkerState'
import getVirtualChannels from '../getVirtualChannels'
import {IConnext, VirtualChannel} from './ConnextTypes'

export async function closeAllVCs(store: Store<WorkerState>, connext: IConnext) {
  const channel = store.getState().runtime.channel

  if (!channel) {
    return
  }

  const vcs = await getVirtualChannels(channel.ledgerId)

  if (!vcs.length) {
    return
  }

  return connext.closeThreads(vcs.map((vc: VirtualChannel) => vc.channelId))
}
