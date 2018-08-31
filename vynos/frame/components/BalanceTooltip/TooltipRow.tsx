import * as React from 'react'
import {CurrencyType} from '../Currency'
import CurrencyIcon from '../CurrencyIcon'
import CC from '../../../lib/CurrencyConvertable'

const s = require('./style.css')

export const TooltipRow = ({amount, outputType, className = s.tooltipRow}: {amount: CC, outputType: CurrencyType, className?: string}) => {
  const content = (
    <React.Fragment>
      <CurrencyIcon className={s.currencyIcon} currency={outputType}/>
      <div className={s.amount}>
        {amount.to(outputType).getDecimalString(0)}
      </div>
      <div className={s.underline}>________</div>
      <div className={s.usdAmount}>
        {amount.to(CurrencyType.USD).format({
          decimals: 2,
          withSymbol: true,
          showTrailingZeros: true,
        })}
      </div>
    </React.Fragment>
  )

  return className
    ? (
      <div className={className}>
        {content}
      </div>
    )
    : content
}