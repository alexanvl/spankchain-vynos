import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

export enum CurrencyIconType {
  FINNEY,
  USD
}

export interface Props {
  className?: string
  reverse?: boolean
  alt?: boolean
  currency?: CurrencyIconType
}

const CurrencyIcon: React.SFC<Props> = function(props) {
  const currency = props.currency === CurrencyIconType.USD ? CurrencyIconType.USD :
    CurrencyIconType.FINNEY

  return (
    <div
      className={classnames(s.currency, props.className, {
        [s.inverse]: props.reverse,
        [s.alt]: props.alt,
        [s.finney]: currency === CurrencyIconType.FINNEY,
        [s.usd]: currency === CurrencyIconType.USD
      })}
    />
  )
}

export default CurrencyIcon
