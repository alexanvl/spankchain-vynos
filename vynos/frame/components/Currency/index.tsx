import * as React from 'react';
import * as classnames from 'classnames'
import WorkerProxy from '../../WorkerProxy'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import CurrencyIcon from '../CurrencyIcon/index'
import {ExchangeRates, CurrencyType} from '../../../worker/WorkerState'
export {CurrencyType} // refactoring so this type is only defined once
import BN = require('bn.js')
import CurrencyConvertable from '../../../lib/CurrencyConvertable'

const s = require('./style.css')

export interface StateProps {
  workerProxy: WorkerProxy
  exchangeRates: ExchangeRates|null
  baseCurrency?: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.BOOTY
}

export interface CurrencyProps extends StateProps {
  amount: BN
  decimals?: number
  outputType?: CurrencyType.ETH | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.WEI | CurrencyType.BOOTY
  inputType: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY
  showUnit?: boolean
  unitClassName?: string
  className?: string
  inverse?: boolean
  alt?: boolean
  color?: string
  big?: boolean
  baseCurrency?: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.BOOTY
}

export class Currency extends React.Component<CurrencyProps, any> {
  public static defaultProps: Partial<CurrencyProps> = {
    decimals: 2,
    outputType: undefined,
    inputType: CurrencyType.WEI,
    showUnit: false,
    inverse: false,
    alt: false,
  }

  formatAmount() {

    const {
      amount,
      decimals,
      inputType,
      outputType
    } = this.props

    let ret: string
    try {
      ret = (new CurrencyConvertable(inputType, amount.toString(10), () => this.props.exchangeRates))
        // displaying as only usd atm
        .to(outputType || CurrencyType.USD)
        .format({
          decimals: decimals !== undefined ? decimals : 2,
          withSymbol: false,
          showTrailingZeros: true
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
      inverse,
      alt,
      color,
      big,
      baseCurrency,
    } = this.props


    return (
      <span className={classnames(s.currency, className)} style={{color: color || 'inherit'}}>
        {renderUnit(showUnit, outputType, unitClassName, inverse, alt, color, big)} {this.formatAmount()}
      </span>
    )
  }
}

const renderUnit = (showUnit?: boolean, outputType?: CurrencyType, unitClassName?: string, inverse?: boolean, alt?: boolean, color?: string, big?: boolean) => (
  showUnit && <CurrencyIcon className={unitClassName} currency={outputType} reverse={inverse} alt={alt} color={color} big={big} spaceAround />
)

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    exchangeRates: state.shared.exchangeRates || null,
    baseCurrency: state.shared.baseCurrency
  }
}

export default connect(mapStateToProps)(Currency)
