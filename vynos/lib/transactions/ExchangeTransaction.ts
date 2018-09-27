import { Store } from "redux";
import { WorkerState, ExchangeRates, CurrencyType } from "../../worker/WorkerState";
import Currency, { ICurrency } from "../currency/Currency";
import CurrencyConvertable from "../currency/CurrencyConvertable";
import { AtomicTransaction } from "./AtomicTransaction";
import Logger from "../Logger";
import { IConnext, LedgerChannel, ChannelType } from "../connext/ConnextTypes";
import withRetries from "../withRetries";
import * as BigNumber from 'bignumber.js'

// TODO
// 1. add blownLoadTracker to persistent state in store to track how much load is left before a blow
// 2. add blown load setters to reducers
// 3. set blown load when it should be set
// 4. add the restart transactions in the onUnlock handler
// 5. refactor to the old pattern

// not completely trustless because hub can freeroll an exchange rate.  Only execute if exchange rate changes in favor
// it's trustless enough though

// proposed change to workerState.persistent (temporary)
// blownLoads: {remainingLoad: ICurrency, totalLoadsBlown: number}

function exchangeTransactionv0 (
  store: Store<WorkerState>,
  logger: Logger,
  connext: IConnext,
) {
  const getBalances = () => {}
  const getExpectedDeposit = (lc: LedgerChannel) => {}
  const hubDidUpdate = (newLc: LedgerChannel, oldLc: LedgerChannel, expectedDeposit: ICurrency) => {
    // or are we expecting the hub to returned the already updated nonce+1 update?
    // if so then we are doing this for tokenBalanceA instead of tokenBalanceI
    const expectedTotal = Currency.BOOTY(new BigNumber(expectedDeposit.amount).plus(oldLc.tokenBalanceI))
    return expectedTotal.amountBigNumber.eq(newLc.tokenBalanceI)
  }

  async function makeOneNonceLaterSwap(sellAmount: ICurrency, buyAmount: ICurrency, exchangeRate: BigNumber.BigNumber) {
    const lc = await connext.getChannelByPartyA()

    if (!lc) {
      throw new Error('cannot make swap without ledger channels')
    }
    const expectedDeposit = getExpectedDeposit(lc)

    const {balanceAETH, balanceABOOTY, balanceBETH, balanceBBOOTY} = this.getBalances(lc, expectedDeposit)

    await connext.updateBalances([
      {
        type: ChannelType.EXCHANGE,
        payment: {
          channelId: lc.channelId,
          balanceA: {
            ethDeposit: balanceAETH.amountBN,
            tokenDeposit: balanceABOOTY.amountBN,
          },
          balanceB: {
            ethDeposit: balanceBETH.amountBN,
            tokenDeposit: balanceBBOOTY.amountBN,
          }
        },
        meta: {exchangeRate: exchangeRate.toString(10)}
      },
    ], /*partyAAddress (don't think I'll need this)*/)

    return [sellAmount, buyAmount, expectedDeposit, lc]
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
    [makeOneNonceLaterSwap, waitForHubDeposit]
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
    this.exchangeTransaction = exchangeTransactionv0(store, logger, connext)
  }

  public swap = async () => {
    const sellAmount = await this.getSellAmount()
    const buyAmount = this.getBuyAmount(sellAmount, CurrencyType.BOOTY)
    await this.exchangeTransaction.start(sellAmount, buyAmount)
  }

  public restartSwap = () => this.exchangeTransaction.restart()

  private getSellAmount = async (): Promise<CurrencyConvertable> => {
    // logic for blown loads and such goes here
    const lc = await this.connext.getChannelByPartyA()

    const lcEthBalance = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, this.exchangeRates)

    const remainingLoad = new CurrencyConvertable(
      CurrencyType.BOOTY,
      this.store.getState().persistent.remainingLoad.amount,
      this.exchangeRates,
    )

    return lcEthBalance.amountBigNumber.gt(remainingLoad.amountBigNumber)
      ? remainingLoad
      : lcEthBalance
  }

  private getBuyAmount = (sellAmount: ICurrency, to: CurrencyType) => {
    return new CurrencyConvertable(
      sellAmount.type,
      sellAmount.amount,
      this.exchangeRates
    ).to(to)
  }

  private exchangeRates = (): ExchangeRates => {
    const out = this.store.getState().runtime.exchangeRates
    if (!out) {
      throw new Error('cannot perform swap if exchange rates are not set')
    }
    return out
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