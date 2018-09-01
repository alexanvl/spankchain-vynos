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
}

export interface CurrencyProps extends StateProps {
  amount: BN
  decimals?: number
  outputType?: CurrencyType.ETH | CurrencyType.USD | CurrencyType.FINNEY | CurrencyType.WEI
  inputType: CurrencyType.ETH | CurrencyType.WEI | CurrencyType.USD | CurrencyType.FINNEY
  showUnit?: boolean
  unitClassName?: string
  className?: string
}

export class Currency extends React.Component<CurrencyProps, any> {
  public static defaultProps: Partial<CurrencyProps> = {
    decimals: 2,
    outputType: CurrencyType.USD,
    inputType: CurrencyType.WEI,
    showUnit: false
  }

  render() {
    const {
      amount,
      decimals,
      inputType,
      outputType,
      showUnit,
      unitClassName,
      className,
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
    } catch(e) {
      console.error('unable to get currency', e)
      ret = '--'
    }

    return (
      <span className={classnames(s.currency, className)}>
        {renderUnit(showUnit, outputType, unitClassName)} {ret}
      </span>
    )
  }
}



const renderUnit = (showUnit?: boolean, outputType?: CurrencyType, unitClassName?: string) => (
  showUnit && (
    outputType === CurrencyType.USD ||
    outputType === CurrencyType.FINNEY ||
    outputType === CurrencyType.ETH
  )
) ? <CurrencyIcon className={unitClassName} currency={outputType}/> : ''

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    exchangeRates: state.shared.exchangeRates || null,
  }
}

export default connect(mapStateToProps)(Currency)
