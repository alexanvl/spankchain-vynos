import { Store } from "redux";
import { WorkerState, ExchangeRates, CurrencyType } from "../../worker/WorkerState";
import Currency, { ICurrency } from "../currency/Currency";
import CurrencyConvertable from "../currency/CurrencyConvertable";
import { AtomicTransaction } from "./AtomicTransaction";
import Logger from "../Logger";
import { IConnext, LedgerChannel, ChannelType } from "../connext/ConnextTypes";
import withRetries from "../withRetries";
import * as BigNumber from 'bignumber.js'
import Web3 = require('web3')
import BN = require('bn.js')
import getAddress from "../getAddress";
import { SIXTY_NINE_BEI } from "../constants";

const ZERO = new BN('0')

function exchangeTransactionV0 (
  store: Store<WorkerState>,
  logger: Logger,
  connext: IConnext,
) {

  const getNewBalancesBN = (lc: LedgerChannel, sellAmount: ICurrency, buyAmount: ICurrency) => {
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


    ethBalanceA = ethBalanceA.gt(ZERO) ? ethBalanceA : ZERO
    ethBalanceI = ethBalanceI.gt(ZERO) ? ethBalanceI : ZERO
    tokenBalanceA = tokenBalanceA.gt(ZERO) ? tokenBalanceA : ZERO
    tokenBalanceI = tokenBalanceI.gt(ZERO) ? tokenBalanceI : ZERO

    return {
      tokenBalanceA: tokenBalanceA,
      tokenBalanceI: tokenBalanceI,
      ethBalanceA: ethBalanceA,
      ethBalanceI: ethBalanceI,
    }
  }

  const hubDidUpdate = (newLc: LedgerChannel, oldLc: LedgerChannel, expectedDeposit: ICurrency) => {
    // or are we expecting the hub to returned the already updated nonce+1 update?
    // if so then we are doing this for tokenBalanceA instead of tokenBalanceI
    const expectedTotal = Currency.BOOTY(new BigNumber(expectedDeposit.amount).plus(oldLc.tokenBalanceI))
    return expectedTotal.amountBigNumber.eq(newLc.tokenBalanceI)
  }

  async function makeSwap(sellAmount: ICurrency, buyAmount: ICurrency, exchangeRate: BigNumber.BigNumber) {
    const lc = await connext.getChannelByPartyA()

    if (!lc) {
      throw new Error('cannot make swap without ledger channels')
    }

    const {tokenBalanceA, tokenBalanceI, ethBalanceA, ethBalanceI} = getNewBalancesBN(lc, sellAmount, buyAmount)

    // ******please change this back to not any now that the types are updated from DW deposit pull request****
    await (connext.updateBalances as any)(
      [
        {
          type: 'EXCHANGE',
          payment: {
            channelId: lc.channelId,
            balanceA: {
              tokenDeposit: tokenBalanceA,
              ethDeposit: ethBalanceA,
            },
            balanceB: {
              tokenDeposit: tokenBalanceI,
              ethDeposit: ethBalanceI,
            },
          },
          meta: { exchangeRate }
        }
      ],
      getAddress(store)
    )

    return [sellAmount, buyAmount, lc]
  }

  async function waitForHubDeposit(expectedDeposit: ICurrency, oldLc: LedgerChannel) {
    await withRetries(async () => {
      const newLc = await connext.getChannelByPartyA()
      if (!hubDidUpdate(newLc, oldLc, expectedDeposit)) {
        throw new Error('Chainsaw has not caught up yet')
      }
    }, 48)
  }

  return new AtomicTransaction<void, [ICurrency, ICurrency]>(
    store,
    logger,
    'doSwapv0',
    [makeSwap, waitForHubDeposit]
  )
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
    this.exchangeTransaction = exchangeTransactionV0(store, logger, connext)
  }

  public swap = async () => {
    // we should only call exchangeRates once so they are consistent throughout entire swap
    const exchangeRates = this.exchangeRates()

    let sellAmount = await this.getSellAmount(exchangeRates, CurrencyType.WEI)
    let buyAmount = this.getBuyAmount(sellAmount, CurrencyType.BOOTY, exchangeRates)

    await this.exchangeTransaction.start(sellAmount, buyAmount)
  }

  public restartSwap = () => this.exchangeTransaction.restart()

  private getSellAmount = async (exchangeRates: ExchangeRates, sellCurrency: CurrencyType): Promise<CurrencyConvertable> => {
    // logic for blown loads and such goes here
    const lc = await this.connext.getChannelByPartyA()

    const lcWeiBalance = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, this.exchangeRates)

    const remainingLoad = new CurrencyConvertable(
      CurrencyType.BOOTY,
      this.getMaxLoad().amountBigNumber,
      () => exchangeRates,
    ).to(sellCurrency)

    return lcWeiBalance.amountBigNumber.gt(remainingLoad.amountBigNumber)
      ? remainingLoad
      : lcWeiBalance
  }

  private getBuyAmount = (sellAmount: ICurrency, to: CurrencyType, exchangeRates: ExchangeRates) => {
    return new CurrencyConvertable(
      sellAmount.type,
      sellAmount.amount,
      () => exchangeRates
    ).to(to)
  }

  private exchangeRates = (): ExchangeRates => {
    // wc: is an extra network request worth guaranteeing we have the latest exchange rates?
    const out = this.store.getState().runtime.exchangeRates
    if (!out) {
      throw new Error('cannot perform swap if exchange rates are not set')
    }
    return out
  }

  private getMaxLoad = (): Currency => {
    return Currency.BEI(SIXTY_NINE_BEI)
  }

  // thought I needed this but then I didn't.  Will likely delete
  private verifyExchangeRate = (
    sellAmount: ICurrency,
    buyAmount: ICurrency,
    exchangeRate: BigNumber.BigNumber
  ) => {
    if (!exchangeRate.div(buyAmount.amount).eq(exchangeRate)) {
      throw new Error('sell amount and buy amount don\'t match provided exchange rate')
    }
    // if getting exchange rate from someone else could imagine an acceptable delta here
    const exchangeRates = this.store.getState().runtime.exchangeRates

    if (!exchangeRates) {
      throw new Error('cannot swap without exchange rates set')
    }

    const sellAmountConvertable = new CurrencyConvertable(sellAmount.type, sellAmount.amount, () => exchangeRates)
    const expectedBuyAmount = sellAmountConvertable.to(buyAmount.type)
    if (sellAmount.amount !== expectedBuyAmount.amount) {
      throw new Error('trade does not match current exchange rates.')
    }
  }
}
