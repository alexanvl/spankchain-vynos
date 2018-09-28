import BN = require('bn.js')
import toFinney from './web3/toFinney' 

export const BEI_PER_BOOTY = '1000000000000000000'
export const GWEI = new BN('1000000000')
export const FINNEY = toFinney(1)
export const FIVE_FINNEY = toFinney(5)
export const TEN_FINNEY = toFinney(10)
export const FIFTEEN_FINNEY = toFinney(15)
export const TWENTY_FINNEY = toFinney(20)
export const ETHER = toFinney(1000)
export const OPEN_CHANNEL_GAS = new BN('300000')
export const CLOSE_CHANNEL_GAS = new BN('750000')
export const DEPOSIT_GAS = new BN('50000')
export const RESERVE_GAS_PRICE = new BN('50')
export const OPEN_CHANNEL_COST = GWEI.mul(RESERVE_GAS_PRICE).mul(OPEN_CHANNEL_GAS)
const actionsBeforeRefill = new BN(3)
export const RESERVE_BALANCE = actionsBeforeRefill.mul(OPEN_CHANNEL_COST)
