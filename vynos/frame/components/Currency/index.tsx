import * as React from 'react';
import * as classnames from 'classnames'
import WorkerProxy from '../../WorkerProxy'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import CurrencyIcon from '../CurrencyIcon/index'
import {ExchangeRates, CurrencyType} from '../../../worker/WorkerState'
import BN = require('bn.js')
import CurrencyConvertable from '../../../lib/currency/CurrencyConvertable'

const s = require('./style.css')

export interface StateProps {
  workerProxy: WorkerProxy
  exchangeRates: ExchangeRates
}

export interface CurrencyProps extends StateProps {
  amount: BN
  decimals?: number
  outputType: CurrencyType.ETH | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.WEI | CurrencyType.BOOTY
  inputType: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY
  showUnit?: boolean
  unitClassName?: string
  className?: string
  inverse?: boolean
  alt?: boolean
  color?: string
  big?: boolean
  baseCurrency?: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.BOOTY
  showPlainTextUnit?: boolean
}

export class Currency extends React.Component<CurrencyProps, any> {
  public static defaultProps: Partial<CurrencyProps> = {
    decimals: 2,
    outputType: CurrencyType.USD,
    inputType: CurrencyType.WEI,
    showUnit: false,
    inverse: false,
    alt: false,
  }

  formatAmount() {

    let {
      amount,
      decimals,
      inputType,
      outputType,
    } = this.props

    let ret: string = ''
    try {
      let curr = (new CurrencyConvertable(inputType, amount.toString(10), () => this.props.exchangeRates))
      if (outputType != inputType) {
        curr = curr.to(outputType)
      }
      decimals = decimals || (outputType == CurrencyType.USD ? 2 : 0)
      ret = curr.format({
        decimals: decimals,
        withSymbol: false,
        showTrailingZeros: outputType == CurrencyType.USD
      })

    } catch (e) {
      console.error('unable to get currency', e)
      ret = '--'
    }

    return ret
  }

  render() {
    let {
      outputType,
      showUnit,
      showPlainTextUnit,
      unitClassName,
      className,
      inverse,
      alt,
      color,
      big,
    } = this.props


    return (
      <span className={classnames(s.currency, className)} style={{color: color || 'inherit'}}>
        {renderUnit(showUnit, outputType, unitClassName, inverse, alt, color, big, showPlainTextUnit)} {this.formatAmount()}
      </span>
    )
  }
}

const renderUnit = (showUnit?: boolean, outputType?: CurrencyType, unitClassName?: string, inverse?: boolean, alt?: boolean, color?: string, big?: boolean, showPlainTextUnit?: boolean) => (
  showUnit &&
  <CurrencyIcon
    className={unitClassName}
    currency={outputType}
    reverse={inverse}
    alt={alt}
    color={color}
    big={big}
    spaceAround
    showPlainText={showPlainTextUnit}
  />
)

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    exchangeRates: state.shared.exchangeRates!,
  }
}

export default connect(mapStateToProps)(Currency)
