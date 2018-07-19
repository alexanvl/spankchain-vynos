import * as BigNumber from 'bignumber.js';
import WorkerProxy from '../WorkerProxy'
import { getGasPrice } from '../../lib/getGasPrice'

export default async function entireBalance(workerProxy: WorkerProxy, walletBalance: BigNumber.BigNumber) {
  const gasPrice = await getGasPrice(workerProxy.web3)
  const gasCost = gasPrice.times(300000)
  return walletBalance.minus(gasCost)
}
