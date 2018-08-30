import BN = require('bn.js')
import WorkerProxy from '../WorkerProxy'
import {FIVE_FINNEY} from '../../lib/constants'

const FIXED_RESERVE = FIVE_FINNEY

export default async function entireBalance (workerProxy: WorkerProxy, walletBalance: BN) {
  const gasPrice = await getGasPrice(workerProxy)
  const gasCost = gasPrice.mul(new BN(1500000))
  return walletBalance.sub(gasCost).sub(FIXED_RESERVE)
}

async function getGasPrice (workerProxy: WorkerProxy): Promise<BN> {
  const str = await workerProxy.web3.eth.getGasPrice()
  return new BN(str)
}
