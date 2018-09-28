import Web3 = require('web3')
import Currency from '../currency/Currency';

export default async function getETHBalance (address: string, web3: Web3): Promise<Currency> {
  return new Promise<Currency>((resolve, reject) =>
    web3.eth.getBalance(address, 'latest',
      (e: Error, balance: number) => e
        ? reject(e)
        : resolve(Currency.WEI(balance)),
    )
  )
}
