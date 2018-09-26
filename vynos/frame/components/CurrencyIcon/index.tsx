import * as React from 'react'
import { connect } from 'react-redux'
import * as classnames from 'classnames'
import {CurrencyType} from '../Currency'

const s = require('./style.css')

export enum CurrencyIconType {
  FINNEY = 'FIN',
  USD = 'USD',
  ETH = 'ETH',
  UNKNOWN = '?',
}

export interface Props {
  className?: string
  reverse?: boolean
  alt?: boolean
  currency?: CurrencyType
  baseCurrency?: CurrencyType
  color?: string
  big?: boolean
  spaceAround?: boolean
}

export class CurrencyIcon extends React.Component<Props, any> {
  render() {
    let { baseCurrency, currency, big, spaceAround, color, alt, reverse, className  } = this.props

    currency = currency || baseCurrency

    const c = currency === CurrencyType.FINNEY ? CurrencyIconType.FINNEY : CurrencyIconType.UNKNOWN

    return (
      <div
        style={{ color: color || 'inherit' }}
        className={classnames(s.currency, className, {
          [s.big]: big,
          [s.spaceAround]: spaceAround,
          [s.inverse]: reverse,
          [s.pink]: color === "#ff3b81",
          [s.alt]: alt,
          [s.finney]: c === CurrencyIconType.FINNEY,
          [s.unknown]: c === CurrencyIconType.UNKNOWN,
        })}
      >{c == CurrencyIconType.UNKNOWN && currency}</div>
    )
  }
}

function mapStateToProps(state: any): any {
  return {
    baseCurrency: state.shared.baseCurrency
  }
}

export default connect(mapStateToProps)(CurrencyIcon)
