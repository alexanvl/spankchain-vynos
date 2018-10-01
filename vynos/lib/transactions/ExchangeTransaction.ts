import {Store} from 'redux'
import {CurrencyType, ExchangeRates, WorkerState} from '../../worker/WorkerState'
import Currency, {ICurrency} from '../currency/Currency'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {ChannelType, IConnext, LedgerChannel} from '../connext/ConnextTypes'
import * as BigNumber from 'bignumber.js'
import {ETHER, ZERO} from '../constants'
import requestJson from '../../frame/lib/request'

import withRetries, {DoneFunc} from '../withRetries'
import getAddress from '../getAddress'
import BN = require('bn.js')

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

function exchangeTransactionV0 (
  store: Store<WorkerState>,
  logger: Logger,
  connext: IConnext
) {
  const exchangeTransaction = new AtomicTransaction<void, [ICurrency, ICurrency]>(
    store,
    logger,
    'doSwapv0',
    [makeSwap, waitForHubDeposit]
  )

  function getNewBalancesBN (lc: LedgerChannel, sellAmount: ICurrency, buyAmount: ICurrency) {
    // add to balance if we are buying it
    // subtract from balance if we are selling it
    let ethBalanceA = new BN(lc.ethBalanceA)
      .add(new BN(buyAmount.type === CurrencyType.ETH ? sellAmount.amount : '0'))
      .sub(new BN(sellAmount.type === CurrencyType.ETH ? sellAmount.amount : '0'))

    let ethBalanceI = new BN(lc.tokenBalanceI)
      .add(new BN(sellAmount.type === CurrencyType.ETH ? sellAmount.amount : '0'))
      .sub(new BN(buyAmount.type === CurrencyType.ETH ? sellAmount.amount : '0'))

    let tokenBalanceA = new BN(lc.tokenBalanceA)
      .add(new BN(buyAmount.type === CurrencyType.BOOTY ? sellAmount.amount : '0'))
      .sub(new BN(sellAmount.type === CurrencyType.BOOTY ? sellAmount.amount : '0'))

    let tokenBalanceI = new BN(lc.tokenBalanceI)
      .add(new BN(sellAmount.type === CurrencyType.BOOTY ? sellAmount.amount : '0'))
      .sub(new BN(buyAmount.type === CurrencyType.BOOTY ? sellAmount.amount : '0'))

    // if any balance is negative that means we are expecting a 0 balance after a LC deposit is made
    ethBalanceA = ethBalanceA.gt(ZERO) ? ethBalanceA : ZERO
    ethBalanceI = ethBalanceI.gt(ZERO) ? ethBalanceI : ZERO
    tokenBalanceA = tokenBalanceA.gt(ZERO) ? tokenBalanceA : ZERO
    tokenBalanceI = tokenBalanceI.gt(ZERO) ? tokenBalanceI : ZERO

    return {
      tokenBalanceA: tokenBalanceA,
      tokenBalanceI: tokenBalanceI,
      ethBalanceA: ethBalanceA,
      ethBalanceI: ethBalanceI
    }
  }

  // hub updated when the balances reflect the new ones after the lc deposit
  function hubDidUpdate (lc: LedgerChannel, tokenBalanceA: BN, tokenBalanceI: BN, ethBalanceA: BN, ethBalanceI: BN) {
    return (
      new BN(lc.ethBalanceA).eq(ethBalanceA) &&
      new BN(lc.ethBalanceI).eq(ethBalanceI) &&
      new BN(lc.tokenBalanceA).eq(tokenBalanceA) &&
      new BN(lc.tokenBalanceI).eq(tokenBalanceI)
    )
  }

  async function makeSwap (sellAmount: ICurrency, buyAmount: ICurrency, exchangeRate: BigNumber.BigNumber) {
    const lc = await connext.getChannelByPartyA()

    if (!lc) {
      throw new Error('cannot make swap without ledger channels')
    }

    const {tokenBalanceA, tokenBalanceI, ethBalanceA, ethBalanceI} = getNewBalancesBN(lc, sellAmount, buyAmount)

    await connext.updateBalances(
      [
        {
          type: ChannelType.EXCHANGE,
          payment: {
            channelId: lc.channelId,
            balanceA: {
              tokenDeposit: tokenBalanceA,
              ethDeposit: ethBalanceA
            },
            balanceB: {
              tokenDeposit: tokenBalanceI,
              ethDeposit: ethBalanceI
            }
          },
          meta: {exchangeRate: exchangeRate.toString(10)}
        }
      ],
      getAddress(store)
    )

    return [tokenBalanceA, tokenBalanceI, ethBalanceA, ethBalanceI]
  }

  async function waitForHubDeposit (tokenBalanceA: BN, tokenBalanceI: BN, ethBalanceA: BN, ethBalanceI: BN) {
    await withRetries(async (done: DoneFunc) => {
      const newLc = await connext.getChannelByPartyA()

      if (hubDidUpdate(newLc, tokenBalanceA, tokenBalanceI, ethBalanceA, ethBalanceI)) {
        done()
      }
    }, 48)
  }

  return exchangeTransaction
}

export default class Exchange {
  private store: Store<WorkerState>
  private exchangeTransaction: AtomicTransaction<void, [ICurrency, ICurrency]>
  private connext: IConnext

  constructor (
    store: Store<WorkerState>,
    logger: Logger,
    connext: IConnext
  ) {
    this.store = store
    this.connext = connext
    this.exchangeTransaction = exchangeTransactionV0(store, logger, connext)
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

    const sellAmount = new CurrencyConvertable(CurrencyType.BOOTY, lc.tokenBalanceA, () => exchangeRates)
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
      CurrencyType.BOOTY,
      bootyLimit.amountBigNumber,
      () => exchangeRates
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

  private getExchangeRateAndLoadLimit = async (): Promise<{ bootyLimit: Currency, exchangeRates: ExchangeRates }> => {
    const {bootyLimit, ethPrice} = await requestJson<HubBootyLoadResponse>(
      `${process.env.HUB_URL}/payments/booty-load-limit/`
    )

    const bootyPriceBN = new BN(1).div(new BN(ethPrice))
    const updatedExchangeRates = {
      ...this.store.getState().runtime.exchangeRates,
      [CurrencyType.BOOTY]: bootyPriceBN.toString(),
      [CurrencyType.ETH]: ethPrice.toString(),
    }

    return {
      bootyLimit: Currency.BOOTY(bootyLimit),
      // we want this exchange rate instead of the one in the store to guarantee we have the latest exchange rate
      exchangeRates: updatedExchangeRates
    }
  }
}
