import * as React from 'react'
import Input from '../../../components/Input'
import classnames = require('classnames')

const s = require('./index.css')

export interface SendCurrencyInputsProps {
  address: string
  addressError: string
  balanceError: string
  isConfirming: boolean
  onAddressChange: Function
  onBalanceChange: Function
  displayedBalances: [string, string]
  bootySupport: boolean
}

export const SendCurrencyInputs = ({
  address,
  addressError,
  balanceError,
  displayedBalances: [leftBalance, rightBalance],
  isConfirming,
  onAddressChange,
  onBalanceChange,
  bootySupport,
}: SendCurrencyInputsProps) => {
  const inputClass = isConfirming
    ? classnames(s.inputBorderless, s.input)
    : classnames(s.input)

  return (
    <React.Fragment>
      <div className={s.contentRow}>
        <div className={s.inputWrapper}>
          <div className={s.inputLabel}>Address</div>
          <Input
            className={inputClass}
            placeholder="0x3930DdDf234..."
            onChange={onAddressChange}
            errorMessage={addressError || (bootySupport ? balanceError : '')}
            disabled={isConfirming}
            value={address}
          />
        </div>
      </div>
      {!bootySupport && <div className={s.contentRow}>
        <div className={s.amountWrapper}>
          <div className={s.inputLabel}>Finney Amount</div>
          <Input
            className={inputClass}
            type="number"
            placeholder="0.00"
            onChange={onBalanceChange(0)}
            errorMessage={balanceError}
            disabled={isConfirming}
            value={leftBalance}
          />
        </div>
        <div className={s.inputEqual}>=</div>
        <div className={s.amountWrapper}>
          <div className={s.inputLabel}>USD</div>
          <Input
            className={inputClass}
            type="number"
            placeholder="0.00"
            onChange={onBalanceChange(1)}
            disabled={isConfirming}
            value={rightBalance}
          />
        </div> 
      </div> }
    </React.Fragment>
  )
}