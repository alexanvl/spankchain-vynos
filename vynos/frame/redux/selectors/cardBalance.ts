import {SharedState} from '../../../worker/WorkerState'
import BN = require('bn.js')

export function cardBalance (sharedState: SharedState): BN {
  const channel = sharedState.channel
  return new BN(channel ? channel.balances.ethBalance.amount : 0)
}
