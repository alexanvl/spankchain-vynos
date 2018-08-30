import BN = require('bn.js')

const FINNEY = new BN('1000000000000000')

export default function toFinney(n: number): BN {
  return FINNEY.mul(new BN(n))
} 
