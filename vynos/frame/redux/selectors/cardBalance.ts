import {SharedState} from '../../../worker/WorkerState'
import BN = require('bn.js')

export function cardBalance (sharedState: SharedState): BN {
  return new BN(sharedState.channel ? sharedState.channel.balanceEth : 0)
}
