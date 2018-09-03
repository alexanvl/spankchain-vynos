import * as React from 'react'
import * as classnames from 'classnames'
import { CurrencyType } from '../Currency';

const s = require('./style.css')

export enum CurrencyIconType {
  FINNEY,
  USD,
  ETH,
  UNKNOWN,
}

export interface Props {
  className?: string
  reverse?: boolean
  alt?: boolean
  currency?: CurrencyType
}

const CurrencyIcon: React.SFC<Props> = function (props) {
  const currency = props.currency === CurrencyType.USD ? CurrencyIconType.USD :
    props.currency === CurrencyType.FINNEY ? CurrencyIconType.FINNEY :
      CurrencyIconType.UNKNOWN

  return (
    <div
      className={classnames(s.currency, props.className, {
        [s.inverse]: props.reverse,
        [s.alt]: props.alt,
        [s.finney]: currency === CurrencyIconType.FINNEY,
        [s.usd]: currency === CurrencyIconType.USD,
        [s.unknown]: currency === CurrencyIconType.UNKNOWN,
      })}
    >{currency == CurrencyIconType.UNKNOWN && props.currency}</div>
  )
}

export default CurrencyIcon
