import * as React from 'react'
import BN = require('bn.js')
import {CurrencyType} from '../Currency'
import CC from '../../../lib/CurrencyConvertable'
import {ExchangeRates} from '../../../worker/WorkerState'
import {TooltipRow} from './TooltipRow'

const s = require('./style.css')

export interface BalanceTooltipProps {
  amount: BN
  inputType: CurrencyType
  reserveBalance: BN
  reserveBalanceType: CurrencyType
  exchangeRates: ExchangeRates|null
}

export const BalanceTooltip = ({amount, inputType, reserveBalance, reserveBalanceType, exchangeRates}: BalanceTooltipProps) => {
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

  return (
    <div className={s.balanceTipLayout}>
      <TooltipRow
        amount={amountWEI}
        outputType={CurrencyType.FINNEY}
      />
      <TooltipRow
        amount={reserveBalanceWEI}
        outputType={CurrencyType.FINNEY}
      />
      <div className={s.reserveBalanceTip}>
        {`FIN ${reserveBalanceWEI.to(CurrencyType.FINNEY).format({decimals: 0, withSymbol: false})} reserved for transactions`}
      </div>
      <TooltipRow
        className={s.totalRow}
        amount={totalWEI}
        outputType={CurrencyType.FINNEY}
      />
    </div>
  )
}


