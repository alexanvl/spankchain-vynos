import BaseMigration from './Migration'
import Logger from '../lib/Logger'
import { BEI_PER_BOOTY, ETHER } from '../lib/constants';
import BN = require('bn.js')
import * as BigNumber from 'bignumber.js'
import Currency from '../lib/currency/Currency';
import requestJson from '../frame/lib/request';
import { ExchangeRateResponse } from '../worker/controllers/HubController';
import { IConnext } from '../lib/connext/ConnextTypes';

/*
 * Exchange Migration handles exchanging eth for booty in channel
 * If 0 ETH is placed in channel to open it (because reserve balance) then nothing will happen.
 * Otherwise it will trigger an +1 nonce update and hub lc deposit exchange 
 * of ETH for BOOTY in channel
 */

const BLOWN_LOAD = Currency.BEI(new BN(BEI_PER_BOOTY).mul(new BN(69)))

export default class ExchangeMigration extends BaseMigration {
  private exchangeTx: any // ExchangeTransaction
  private connext: IConnext 

  constructor (
    logger: Logger, 
    name: string, 
    address: string, 
    exchangeTx: any, // ExchangeTransaction, 
    connext: IConnext
  ) {
    super(logger, name, address)
    this.exchangeTx = exchangeTx
    this.connext = connext
  }

  async execute (): Promise<void> {
    const amount = await this.getExchangeAmount()
    const exchangeRate = await this.getExchangeRate()

    this.exchangeTx.exchange(amount, exchangeRate)
  }

  private async getExchangeAmount() {
    const lc = await this.connext.getChannelByPartyA()

    const ethBalance = Currency.ETH(lc.ethBalanceA)

    if (ethBalance.amountBN.gt(BLOWN_LOAD.amountBN)) {
      return BLOWN_LOAD
    }
    return ethBalance
  }

  private async getExchangeRate() {
    const res = await requestJson<ExchangeRateResponse>(`${process.env.HUB_URL!}/exchangeRate/`)

    const WEI_PER_BOOTY= new BigNumber(ETHER.toString(10))
      .div(res.rates.USD)

    return WEI_PER_BOOTY
  }
}
