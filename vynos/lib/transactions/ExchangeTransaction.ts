import {Store} from 'redux'
import {WorkerState, CurrencyType} from '../../worker/WorkerState'
import Currency, {ICurrency} from '../currency/Currency'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {IConnext, LedgerChannel} from '../connext/ConnextTypes'
import withRetries from '../withRetries'
import * as BigNumber from 'bignumber.js'
import BN = require('bn.js')
import getAddress from '../getAddress'

const ZERO = new BN('0')

/*
 * exchange transaction atomically does the critical parts of the exchange which need to be atomic
 * This is the connext.updateBalance call and waiting for the hub to lcDeposit and complete the exchange
 *
 * it also handles the logic behind createing the Exchange balances that connext.UpdateBalances needs given a sell amount, a buy amount and the exchangeRate.
 *
 * note that actions we would want to redo on a restart such as fetching the exchange rate and load limit are in Exchange and not the AtomicTransaction
 *
 * We should think harder about what should and shouldn't be Atomic in the other transactions and seperate the atomic parts out so we don't have any stale "NextMethodArgs" in
 * the AtomicTransaction.
 */

export type HubBootyLoadResponse = {
  bootyLimit: string, // decimal string
  ethPrice: string, // decimal string
}

export default function exchangeTransactionV0 (
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
