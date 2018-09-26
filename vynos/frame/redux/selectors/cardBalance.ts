import {SharedState} from '../../../worker/WorkerState'
import BN = require('bn.js')

export function cardBalance (sharedState: SharedState): BN {
<<<<<<< HEAD
  return new BN(sharedState.channel ? sharedState.channel.balanceEth : 0)
=======
  const channel = sharedState.channel
  return new BN(channel.balances.ethBalance.amount)
>>>>>>> origin/develop
}
