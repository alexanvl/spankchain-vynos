import * as React from 'react'
import BN = require('bn.js')
import CC from '../../../lib/currency/CurrencyConvertable'
import { ExchangeRates, CurrencyType } from '../../../worker/WorkerState'
import { TooltipRow } from './TooltipRow'

const s = require('./style.css')

export interface BalanceTooltipProps {
  amount: BN
  inputType: CurrencyType
  reserveBalance: BN
  reserveBalanceType: CurrencyType
  exchangeRates: ExchangeRates | null
  hasActiveDeposit?: boolean
  currencyType: CurrencyType
}

let amountReservedWei: CC
let canUpdateAmountReserved = true

export const BalanceTooltip = ({
  amount,
  inputType,
  reserveBalance,
  reserveBalanceType,
  exchangeRates,
  hasActiveDeposit,
  currencyType
}: BalanceTooltipProps) => {
  if (!amountReservedWei) {
    amountReservedWei = new CC(CurrencyType.WEI, '0', () => exchangeRates)
  }

  const reserveBalanceWEI = new CC(
    reserveBalanceType,
    reserveBalance.toString(10),
    () => exchangeRates,
  ).toWEI()

  const amountWEI = new CC(
    inputType,
    amount.toString(10),
    () => exchangeRates,
  ).toWEI()

  const totalWEI = new CC(
    CurrencyType.WEI,
    amountWEI.amountBigNumber.add(reserveBalanceWEI.amountBigNumber),
    () => exchangeRates,
  ).toWEI()

  if (!hasActiveDeposit && canUpdateAmountReserved) {
    amountReservedWei = reserveBalanceWEI
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
        amount={amountWEI}
        outputType={currencyType}
      />
      <TooltipRow
        amount={amountReservedWei}
        outputType={CurrencyType.FINNEY}
      />
      <div className={s.reserveBalanceTip}>
        {`FIN ${amountReservedString} reserved for transactions`}
      </div>
      <TooltipRow
        className={s.totalRow}
        amount={totalWEI}
        outputType={currencyType}
      />
    </div>
  )
}


