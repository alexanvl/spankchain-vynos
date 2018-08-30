import * as React from 'react'
import BN = require('bn.js')
import {CurrencyType} from '../Currency'
import Currency from '../Currency'
import CC from '../../../lib/CurrencyConvertable'
import {ExchangeRates} from '../../../worker/WorkerState'


export interface BalanceToolBarProps {
  amount: BN
  inputType: CurrencyType
  reserveBalance: BN
  reserveBalanceType: CurrencyType
  exchangeRates: ExchangeRates|null
}

export const BalanceToolBar = ({amount, inputType, reserveBalance, reserveBalanceType, exchangeRates}: BalanceToolBarProps) => {
  const rb = new CC(reserveBalanceType, reserveBalance.toString(10), () => exchangeRates)

  return (
    <React.Fragment>
      {/*
      <Currency
        amount={amount}
        inputType={inputType}
        outputType="FIN"
        decimals={0}
        showUnit
      />
      <Currency
        amount={reserveBalance}
        inputType={reserveBalanceType}
        outputType="FIN"
        decimals={0}
        showUnit
      />
      */}
      {`${rb.to(CurrencyType.USD).format({decimals: 0, withSymbol: true})} reserved for transactions`}
    </React.Fragment>
  )
}