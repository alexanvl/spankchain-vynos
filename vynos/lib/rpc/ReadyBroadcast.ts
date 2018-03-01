import {ResponsePayload} from '../Payload'

export const ReadyBroadcastType = 'worker/broadcast/ready'

export interface ReadyBroadcast extends ResponsePayload {
  id: typeof ReadyBroadcastType,
  result: null
}
