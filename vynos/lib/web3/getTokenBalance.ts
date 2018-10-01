import Web3 = require('web3')
import Currency from "../currency/Currency";

import { HumanStandardToken } from "../HumanStandardToken";
const tokenABI = require('human-standard-token-abi')

export default async function getTokenBalance(
  web3: Web3, 
  address: string, 
  tokenAddress: string = process.env.BOOTY_CONTRACT_ADDRESS!
): Promise<Currency> {
  
  const contract = new web3.eth.Contract(tokenABI, tokenAddress) as HumanStandardToken
  
  try {
    const amount = await contract
       .methods
       .balanceOf(address)
       .call({from: address})

    return  Currency.BOOTY(amount)
  
  } catch(e){
    throw new Error(`unable to get ERC20 balance ${address} ${e}`)
  }
}
