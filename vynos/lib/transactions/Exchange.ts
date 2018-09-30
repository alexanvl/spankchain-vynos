import {Store} from 'redux'
import {WorkerState, ExchangeRates, CurrencyType} from '../../worker/WorkerState'
import Currency, {ICurrency} from '../currency/Currency'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {IConnext} from '../connext/ConnextTypes'
import * as BigNumber from 'bignumber.js'
import {ETHER} from '../constants'
import requestJson from '../../frame/lib/request'

import exchangeTransaction from './ExchangeTransaction'

/*
 * Exchange handles all the logic of figuring out how much to exchange and executing an exchangeTransaction
 *
 * This includes figuring out the exchange amounts based on the lcBalances, fetching the limits and most up to date exchange rates
 *
 * The actual Exchange itself is handled by ExchangeTransaction
 *
 */

export type HubBootyLoadResponse = {
  bootyLimit: string, // decimal string
  ethPrice: string, // decimal string
}

export default class Exchange {
  private store: Store<WorkerState>
  private exchangeTransaction: AtomicTransaction<void, [ICurrency, ICurrency]>
  private connext: IConnext

  constructor (
    store: Store<WorkerState>,
    logger: Logger,
    connext: IConnext,
  ) {
    this.store = store
    this.connext = connext
    this.exchangeTransaction = exchangeTransaction(store, logger, connext)
  }

  public swapOnDeposit = async () => {
    // we should only call exchangeRates once so they are consistent throughout entire swap
    const {beiPerWei, bootyLimit} = await this.getExchangeRateAndLoadLimit()

    const updatedExchangeRates = {
      ...this.store.getState().runtime.exchangeRates,
      [CurrencyType.BEI]: beiPerWei,
    }

    let sellAmount = await this.getSellAmount(updatedExchangeRates, CurrencyType.WEI, bootyLimit)
    let buyAmount = this.getBuyAmount(sellAmount, CurrencyType.BOOTY, updatedExchangeRates)

    await this.exchangeTransaction.start(sellAmount, buyAmount)
  }

  public restartSwaps = () => this.exchangeTransaction.isInProgress() && this.exchangeTransaction.restart()

  private getSellAmount = async (exchangeRates: ExchangeRates, sellCurrencyType: CurrencyType, bootyLimit: Currency): Promise<CurrencyConvertable> => {
    // logic for blown loads and such goes here
    const lc = await this.connext.getChannelByPartyA()

    const lcWeiBalance = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, () => exchangeRates)

    const remainingLoad = new CurrencyConvertable(
      CurrencyType.BEI,
      bootyLimit.amountBigNumber,
      () => exchangeRates,
    ).to(sellCurrencyType)

    return lcWeiBalance.amountBigNumber.gt(remainingLoad.amountBigNumber)
      ? remainingLoad
      : lcWeiBalance
  }

  private getBuyAmount = (sellAmount: ICurrency, buyCurrencyType: CurrencyType, exchangeRates: ExchangeRates) => {
    return new CurrencyConvertable(
      sellAmount.type,
      sellAmount.amount,
      () => exchangeRates
    ).to(buyCurrencyType)
  }

  private getExchangeRateAndLoadLimit = async (): Promise<{bootyLimit: Currency, beiPerWei: string}> => {
    const HUB_URL = this.store.getState().runtime.authorizationRequest!.hubUrl

    const {bootyLimit, ethPrice} = await requestJson<HubBootyLoadResponse>(`${HUB_URL}/payments/booty-load-limit/`)

    console.log('I am guessing this bootyLimit to be in BEI and not BOOTY, is it?', bootyLimit)

    const beiPerWei = new BigNumber(1).div(new BigNumber(ethPrice)).mul(ETHER.toString(10))

    console.log('beiPerWei')

    return {
      bootyLimit: Currency.BEI(bootyLimit),
      // we want this exchange rate instead of the one in the store to guarantee we have the latest exchange rate
      beiPerWei: beiPerWei.toString(10),
    }
  }
}
