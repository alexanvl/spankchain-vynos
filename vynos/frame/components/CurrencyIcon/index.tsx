import * as React from 'react'
import { connect } from 'react-redux'
import * as classnames from 'classnames'
import { CurrencyType } from '../Currency'
import { FrameState } from '../../redux/FrameState'

const s = require('./style.css')

export interface Props {
  className?: string
  reverse?: boolean
  alt?: boolean
  currency?: CurrencyType
  baseCurrency: CurrencyType
  color?: string
  big?: boolean
  spaceAround?: boolean
  showPlainText?: boolean
}

export class CurrencyIcon extends React.Component<Props, any> {
  render() {
    let {baseCurrency, currency, big, spaceAround, color, alt, reverse, className, showPlainText} = this.props

    const c = currency || baseCurrency

    const isUnknownCurrency = c && !(c in CurrencyType)

    return (
      <div
        style={{ color: color || 'inherit' }}
        className={classnames(s.currency, className, {
          [s.big]: big,
          [s.spaceAround]: spaceAround,
          [s.inverse]: reverse,
          [s.pink]: color === "#ff3b81",
          [s.alt]: alt,
          [s.pink]: color === 'pink',
          [s.green]: color === 'green',
          [s.finney]: c === CurrencyType.FINNEY,
          [s.boo]: c === CurrencyType.BOOTY,
          [s.usd]: c === CurrencyType.USD,
          [s.unknown]: isUnknownCurrency,
        })}
      >
        {isUnknownCurrency || showPlainText ? currency : null}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState)  {
  return {
    baseCurrency: state.shared.baseCurrency
  }
}

export default connect(mapStateToProps)(CurrencyIcon)
