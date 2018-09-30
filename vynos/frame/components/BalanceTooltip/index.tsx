import * as React from 'react'
import BN = require('bn.js')
import CC from '../../../lib/currency/CurrencyConvertable'
import { ExchangeRates, CurrencyType, Balances } from '../../../worker/WorkerState'
import { TooltipRow } from './TooltipRow'

const s = require('./style.css')

export interface BalanceTooltipProps {
  amount: BN
  inputType: CurrencyType
  reserveBalance: BN
  reserveBalanceType: CurrencyType
  exchangeRates: ExchangeRates
  hasActiveDeposit?: boolean
  currencyType: CurrencyType
  cardBalances: Balances
}

let amountReservedWei: CC
let canUpdateAmountReserved = true

export const BalanceTooltip = ({
  reserveBalance,
  reserveBalanceType,
  exchangeRates,
  hasActiveDeposit,
  currencyType,
  cardBalances
}: BalanceTooltipProps) => {
  if (!amountReservedWei) {
    amountReservedWei = new CC(CurrencyType.WEI, '0', () => exchangeRates)
  }

  const reserveBalanceFIN = new CC(
    reserveBalanceType,
    reserveBalance.toString(10),
    () => exchangeRates,
  ).toFIN()

  console.log('eth balance', cardBalances.ethBalance.type, cardBalances.ethBalance.amount)

  const ethBalanceFIN = new CC(
    cardBalances.ethBalance.type,
    cardBalances.ethBalance.amount,
    () => exchangeRates,
  ).toFIN()

  const bootyBalanceBOOTY = new CC(
    cardBalances.tokenBalance.type,
    cardBalances.tokenBalance.amount,
    () => exchangeRates,
  ).to(CurrencyType.BOOTY)

  const total = new CC(
    CurrencyType.FINNEY,
    ethBalanceFIN
      .amountBigNumber
      .add(reserveBalanceFIN.amountBigNumber)
      .add(bootyBalanceBOOTY.toFIN().amountBigNumber),
    () => exchangeRates,
  ).to(currencyType)

  if (!hasActiveDeposit && canUpdateAmountReserved) {
    amountReservedWei = reserveBalanceFIN
  }
  canUpdateAmountReserved = !!hasActiveDeposit

  const amountReservedString = amountReservedWei
    .to(CurrencyType.FINNEY)
    .format({
      decimals: 0,
      withSymbol: false,
    })

  return (
    <div className={s.balanceTipLayout}>
      <TooltipRow
        amount={ethBalanceFIN}
        outputType={CurrencyType.FINNEY}
      />
      <TooltipRow
        amount={bootyBalanceBOOTY}
        outputType={CurrencyType.BOOTY}
      />
      <TooltipRow
        amount={reserveBalanceFIN}
        outputType={CurrencyType.FINNEY}
      />
      <div className={s.reserveBalanceTip}>
        {`FIN ${amountReservedString} reserved for transactions`}
      </div>
      <TooltipRow
        className={s.totalRow}
        amount={total}
        outputType={currencyType}
      />
    </div>
  )
}

