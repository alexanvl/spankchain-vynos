import BigNumber from 'bignumber.js';
import Web3 = require('web3')
import { getGasPrice } from './getGasPrice'

const FINNEY = new BigNumber('1e15')
const GWEI = new BigNumber('1e9')

const toFinney = (n: number) => FINNEY.mul(n)
const toGwei = (n: number) => GWEI.mul(n)

const TEN_GWEI = toGwei(10)
const FIFTY_GWEI = toGwei(50)
export const FIVE_FINNEY = toFinney(5)
export const TEN_FINNEY = toFinney(10)
export const TWENTY_FINNEY = toFinney(20)

export class MinDeposit {
  private web3: Web3

  constructor(web3: Web3) {
    this.web3 = web3
  }

  public async get(): Promise<BigNumber.BigNumber> {
    let gasPrice
    try {
      gasPrice = await getGasPrice(this.web3)
    } catch(e) {
      throw new Error('unable to get gas price')
    }
    return this.minDepositStepFunction(gasPrice)
  }

  private minDepositStepFunction(gasPrice: BigNumber.BigNumber): BigNumber.BigNumber {
    if (gasPrice.lessThan(TEN_GWEI)) {
      return FIVE_FINNEY
    } else if (gasPrice.lessThan(FIFTY_GWEI)) {
      return TEN_FINNEY
    } else {
      return TWENTY_FINNEY
    }
  }
}
