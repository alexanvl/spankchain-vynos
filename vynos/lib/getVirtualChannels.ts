import VirtualChannel from './connext/VirtualChannel'
import requestJson from '../frame/lib/request'

export default async function getVirtualChannels (lcId: string): Promise<VirtualChannel[]> {
    return requestJson(`${process.env.HUB_URL!}/ledgerchannel/${lcId}/vcs`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    }) as Promise<VirtualChannel[]>
  }