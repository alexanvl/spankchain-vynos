import {Store} from 'redux'
import {WorkerState, ExchangeRates, CurrencyType} from '../../worker/WorkerState'
import Currency, {ICurrency} from '../currency/Currency'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {IConnext} from '../connext/ConnextTypes'
import * as BigNumber from 'bignumber.js'
import {ETHER, BOOTY} from '../constants'
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

const WEI_PER_ETH = ETHER

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

  // figures out exact parameters of a swap based on exchange rate, channel state, and load limit (ran after a deposit)
  public swapEthForBooty = async () => {
    // we should only get exchangeRates once so they are consistent throughout entire swap
    const {exchangeRates, bootyLimit} = await this.getExchangeRateAndLoadLimit()

    const sellAmount = await this.getSellAmount(exchangeRates, CurrencyType.WEI, bootyLimit)
    const buyAmount = this.getBuyAmount(sellAmount, CurrencyType.BOOTY, exchangeRates)

    await this.exchangeTransaction.start(sellAmount, buyAmount)
  }

  // swaps all booty for eth (ran before a ConsensusClose)
  public swapBootyForEth = async () => {
    const {exchangeRates} = await this.getExchangeRateAndLoadLimit()

    const lc = await this.connext.getChannelByPartyA()

    const sellAmount = new CurrencyConvertable(CurrencyType.BEI, lc.tokenBalanceA, () => exchangeRates)
    const buyAmount = sellAmount.to(CurrencyType.WEI)

    await this.exchangeTransaction.start(sellAmount, buyAmount)
  }

  public restartSwap = () => {
    if (this.isInProgress()) {
      this.exchangeTransaction.restart()
    }
   }

  public isInProgress = () => this.exchangeTransaction.isInProgress()

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

  private getExchangeRateAndLoadLimit = async (): Promise<{bootyLimit: Currency, exchangeRates: ExchangeRates}> => {
    const {bootyLimit, ethPrice} = await requestJson<HubBootyLoadResponse>(
      `${process.env.HUB_URL}/payments/booty-load-limit/`
    )

    console.log('I am guessing this bootyLimit to be in BEI and not BOOTY, is it?', bootyLimit)

    const beiPerWei = new BigNumber(BOOTY.amount)
      .mul(ethPrice)
      .div(WEI_PER_ETH.toString(10))

    console.log('beiPerWei')

    const updatedExchangeRates = {
      ...this.store.getState().runtime.exchangeRates,
      [CurrencyType.BEI]: beiPerWei.toString(10),
    }

    return {
      bootyLimit: Currency.BEI(bootyLimit),
      // we want this exchange rate instead of the one in the store to guarantee we have the latest exchange rate
      exchangeRates: updatedExchangeRates,
    }
  }
}
