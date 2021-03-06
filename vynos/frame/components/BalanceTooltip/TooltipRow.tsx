import * as React from 'react'
import * as classnames from 'classnames'
import CurrencyIcon from '../CurrencyIcon'
import Button from '../Button'
import CC from '../../../lib/currency/CurrencyConvertable'
import { CurrencyType } from '../../../worker/WorkerState';

const s = require('./style.css')

export const TooltipRow = ({ amount, outputType, className = s.tooltipRow, title, cta, noConvert }: { amount: CC, outputType: CurrencyType, className?: string, title: string, cta?: { href: string, text: string }, noConvert?: boolean}) => {
  return (
    <div className={classnames(s.tooltipRow, className)}>
      <h3>{title}</h3>
      <div className={classnames(s.flex, s.bottom, s.amountInfo)}>
        <div className={classnames(s.flex, s.bottom)}>
          <CurrencyIcon className={s.iconCol} currency={outputType} color='white' />
          <div className={s.amount}>
            {amount.to(outputType).format({ showTrailingZeros: false, withSymbol: false })}
          </div>
        </div>
        {!noConvert &&
          <React.Fragment>
            <div className={s.underline}></div>
            <div className={s.usdAmount}>
              {amount.to(CurrencyType.USD).format()}
            </div>
          </React.Fragment>
        }
      </div>
      {cta &&
        <Button className={s.cta} to={cta.href} content={cta.text} backgroundHex='#fff' colorHex='#444' isMini isFullWidth/>
      }
    </div>
  )
}