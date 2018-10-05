import {Store} from 'redux'
import {CurrencyType, WorkerState} from '../../worker/WorkerState'
import {ICurrency} from '../currency/Currency'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {ChannelType, IConnext, LedgerChannel} from '../connext/ConnextTypes'
import withRetries, {DoneFunc} from '../withRetries'
import * as BigNumber from 'bignumber.js'
import getAddress from '../getAddress'
import BN = require('bn.js')
import * as actions from '../../worker/actions'

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
  connext: IConnext
) {
  const exchangeTransaction = new AtomicTransaction<void, [ICurrency, ICurrency]>(
    store,
    logger,
    'doSwapv0',
    [makeSwap, waitForHubDeposit],
    () => store.dispatch(actions.setHasActiveExchange(false)),
    () => store.dispatch(actions.setHasActiveExchange(true)),
    () => store.dispatch(actions.setHasActiveExchange(true)),
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

    throw new Error('uhoh')
    /*
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
    */
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
