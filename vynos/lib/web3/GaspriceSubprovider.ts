import { BigNumber } from 'bignumber.js';

export const Subprovider = require('web3-provider-engine/subproviders/subprovider')

const GWEI = new BigNumber('1e9')
const MAX_PRICE = GWEI.mul(50)

interface Transaction {
  gasPrice: string
}

export default class GaspriceSubprovider extends Subprovider {
  handleRequest(payload: any, next: () => void, end: (err: any, res?: any) => void) {
    if (payload.method !== 'eth_gasPrice') {
      return next()
    }

    this.emitPayload({ method: 'eth_blockNumber'}, (err: any, res: any) => {
      let lastBlock = new BigNumber(res.result)
      const blockNums = []

      for (let i = 0; i < 10; i++) {
        blockNums.push(`0x${lastBlock.toString(16)}`)
        lastBlock = lastBlock.minus(1)
      }

      const gets = blockNums.map((item: string) => this.getBlock(item))

      Promise.all(gets).then((blocks: Transaction[][]) => {
        const price = BigNumber.min(this.meanGasPrice(blocks), MAX_PRICE)

        end(null, `0x${price.toString(16)}`)
      }).catch((e) => end(err))
    })
  }

  getBlock (item: string) {
    return new Promise((resolve, reject) => this.emitPayload({ method: 'eth_getBlockByNumber', params: [ item, true ] }, (err: any, res: any) => {
      if (err) {
        return reject(err)
      }

      if (!res.result) {
        return resolve([])
      }

      resolve(res.result.transactions)
    }))
  }

  private meanGasPrice(blocks: Transaction[][]): BigNumber {
    let sum = new BigNumber(0)
    let count = 0

    for (let i = 0; i < blocks.length; i++) {
      const txns = blocks[i]

      for (let j = 0; j < txns.length; j++) {
        const currPrice = new BigNumber(txns[j].gasPrice)
        sum = sum.add(currPrice)
        count++
      }
    }

    return sum.dividedBy(count).floor()
  }
}
