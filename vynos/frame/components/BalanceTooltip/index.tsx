import * as React from 'react'
import CC from '../../../lib/currency/CurrencyConvertable'
import {Balances, CurrencyType, ExchangeRates} from '../../../worker/WorkerState'
import {TooltipRow} from './TooltipRow'
import BN = require('bn.js')

const s = require('./style.css')

export interface BalanceTooltipProps {
  amount: BN
  inputType: CurrencyType
  reserveBalance: BN
  exchangeRates: ExchangeRates
  hasActiveDeposit?: boolean
  currencyType: CurrencyType
  cardBalances: Balances
}

let amountReservedWei: CC
let canUpdateAmountReserved = true

export const BalanceTooltip = ({
  reserveBalance,
  exchangeRates,
  hasActiveDeposit,
  currencyType,
  cardBalances
}: BalanceTooltipProps) => {
  if (!amountReservedWei) {
    amountReservedWei = new CC(CurrencyType.WEI, '0', () => exchangeRates)
  }

  const reserveBalanceWei = new CC(
    CurrencyType.WEI,
    reserveBalance,
    () => exchangeRates,
  )

  const ethBalanceWei = new CC(
    CurrencyType.WEI,
    cardBalances.ethBalance.amount,
    () => exchangeRates,
  )

  const bootyBalanceBOOTY = new CC(
    CurrencyType.BEI,
    cardBalances.tokenBalance.amount,
    () => exchangeRates,
  )

  const total = new CC(
    CurrencyType.USD,
    ethBalanceWei
      .toUSD()
      .amountBigNumber
      .add(reserveBalanceWei.toUSD().amountBigNumber)
      .add(bootyBalanceBOOTY.toUSD().amountBigNumber),
    () => exchangeRates,
  )

  if (!hasActiveDeposit && canUpdateAmountReserved) {
    amountReservedWei = reserveBalanceWei
  }
  canUpdateAmountReserved = !!hasActiveDeposit

  const amountReservedString = amountReservedWei
    .toFIN()
    .format({
      decimals: 0,
      withSymbol: false,
    })

  return (
    <div className={s.balanceTooltip}>
      <div className={s.balanceTipLayout}>
        <TooltipRow
          title='Booty balance'
          amount={bootyBalanceBOOTY}
          outputType={CurrencyType.BOOTY}
        />
        <TooltipRow
          title='Ether balance'
          amount={ethBalanceWei}
          outputType={CurrencyType.ETH}
        />
        <TooltipRow
          title='Reserved for transactions'
          amount={reserveBalanceWei}
          outputType={CurrencyType.ETH}
          cta={{ text: 'Why?', href:'https://spankchain.zendesk.com/hc/en-us/articles/360016779451'}}
        />
      </div>
      <TooltipRow
        title='Total balance'
        className={s.totalRow}
        amount={total}
        outputType={CurrencyType.USD}
      />
    </div>
  )
}

