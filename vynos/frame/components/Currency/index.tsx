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
  exchangeRates: ExchangeRates
}

export interface CurrencyProps extends StateProps {
  amount: BN|number|string
  decimals?: number
  outputType: CurrencyType
  inputType: CurrencyType
  showUnit?: boolean
  unitClassName?: string
  className?: string
  color?: string
  big?: boolean
  blank?: boolean
}

export const colors: any = {
  'green': '#55a451',
  'pink': '#ff3b81',
  'grey': '#797979',
  'white': '#ffffff',
  'red': '#d0021b',
}

export class Currency extends React.Component<CurrencyProps, any> {
  public static defaultProps: Partial<CurrencyProps> = {
    decimals: 2,
    outputType: CurrencyType.USD,
    inputType: CurrencyType.WEI,
    showUnit: false,
  }

  formatAmount() {
    let {
      amount,
      decimals,
      inputType,
      outputType,
      blank
    } = this.props

    if (blank) {
      return '--'
    }

    let ret: string = ''
    try {
      let curr = (new CurrencyConvertable(inputType, amount.toString(), () => this.props.exchangeRates))
      if (outputType != inputType) {
        curr = curr.to(outputType)
      }
      ret = curr.format({
        decimals,
        withSymbol: false
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
      unitClassName,
      className,
      color = 'grey',
      big,
    } = this.props


    return (
      <span className={classnames(s.currency, className)} style={{color: colors[color] || 'inherit'}}>
        {renderUnit(showUnit, outputType, unitClassName, color, big)} {this.formatAmount()}
      </span>
    )
  }
}

const renderUnit = (showUnit?: boolean, outputType?: CurrencyType, unitClassName?: string, color?: string, big?: boolean) => (
  showUnit &&
  <CurrencyIcon
    className={unitClassName}
    currency={outputType}
    color={color}
    big={big}
    spaceAround
  />
)

function mapStateToProps (state: FrameState): StateProps {
  return {
    exchangeRates: state.shared.exchangeRates!,
  }
}

export default connect(mapStateToProps)(Currency)
