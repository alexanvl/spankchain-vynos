import {VirtualChannel} from './connext/ConnextTypes'
import BN = require('bn.js')

export default function aggregateVCBalances(address: string, vcs: VirtualChannel[]) {
  let balanceEth = new BN(0)
  let balanceToken = new BN(0)

  vcs.forEach((curr: VirtualChannel) => {
    if (address === curr.partyA) {
      balanceEth = balanceEth.add(new BN(curr.ethBalanceA))
      balanceToken = balanceToken.add(new BN(curr.tokenBalanceA))
    } else if (address === curr.partyB) {
      balanceEth = balanceEth.add(new BN(curr.ethBalanceB))
      balanceToken = balanceToken.add(new BN(curr.tokenBalanceB))
    } else {
      throw new Error('Channel does not belong to address.')
    }
  })

  return { balanceEth, balanceToken }
}
