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
    <div>
      <div className={s.balanceTipLayout}>
        <TooltipRow
          amount={ethBalanceWei}
          outputType={CurrencyType.FINNEY}
        />
        <TooltipRow
          amount={bootyBalanceBOOTY}
          outputType={CurrencyType.BOOTY}
        />
        <TooltipRow
          amount={reserveBalanceWei}
          outputType={CurrencyType.FINNEY}
        />
        <div className={s.reserveBalanceTip}>
          {`FIN ${amountReservedString} reserved for transactions`}
        </div>
      </div>
      <TooltipRow
        className={s.totalRow}
        amount={total}
        outputType={CurrencyType.USD}
      />
    </div>
  )
}

