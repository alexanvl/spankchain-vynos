import {VirtualChannel} from './connext/ConnextTypes'
import requestJson from '../frame/lib/request'

export default async function getVirtualChannels (lcId: string): Promise<VirtualChannel[]> {
    return requestJson<VirtualChannel[]>(`${process.env.HUB_URL!}/ledgerchannel/${lcId}/vcs`)
  }
