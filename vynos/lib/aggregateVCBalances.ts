import {VirtualChannel} from './connext/ConnextTypes'
import BN = require('bn.js')

export default function aggregateVCBalances(address: string, vcs: VirtualChannel[]): BN {
  return vcs.reduce((acc: BN, curr: VirtualChannel) => {
    let balance

    if (address === curr.partyA) {
      balance = curr.ethBalanceA
    } else if (address === curr.partyB) {
      balance = curr.ethBalanceB
    } else {
      throw new Error('Channel does not belong to address.')
    }

    return acc.add(new BN(balance))
  }, new BN(0))
}
