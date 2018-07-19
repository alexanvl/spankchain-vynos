import Web3 from 'web3'
import { BigNumber } from 'bignumber.js'

export function getGasPrice (web3: Web3): Promise<BigNumber> {
  return new Promise((resolve, reject) => web3.eth.getGasPrice((err: any, data: BigNumber) => {
    return err ? reject(err): resolve(data)
  }))
}
