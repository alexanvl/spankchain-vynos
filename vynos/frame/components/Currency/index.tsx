import * as React from 'react';
import * as BigNumber from 'bignumber.js';
import WorkerProxy from '../../WorkerProxy'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'

const s = require('./style.css')

export enum CurrencyType {
  USD,
  ETH,
  WEI
}

export interface StateProps {
  workerProxy: WorkerProxy
}

export interface CurrencyProps extends StateProps {
  amount: BigNumber.BigNumber
  decimals?: number
  outputType?: CurrencyType.ETH | CurrencyType.USD
  inputType?: CurrencyType.ETH | CurrencyType.WEI
  showUnit?: boolean
}

export class Currency extends React.Component<CurrencyProps, any> {
  public static defaultProps: Partial<CurrencyProps> = {
    decimals: 2,
    outputType: CurrencyType.USD,
    inputType: CurrencyType.WEI,
    showUnit: false
  }

  render() {
    const { amount, decimals, inputType, outputType, showUnit } = this.props

    let ret

    if (inputType === outputType) {
      ret = new BigNumber.BigNumber(amount).toFixed(decimals).toString()
    } else if (outputType === CurrencyType.USD) {
      const eth = inputType === CurrencyType.ETH ?
        amount : new BigNumber.BigNumber(this.props.workerProxy.web3.fromWei(amount, 'ether'))

      ret = eth.mul(880).toFixed(decimals).toString()
    } else {
      ret = this.props.workerProxy.web3.fromWei(amount, 'ether').toFixed(decimals).toString()
    }

    return (
      <span className={s.currency}>
        {showUnit && outputType === CurrencyType.USD ? '$' : ''} {ret}
      </span>
    )
  }
}

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(Currency)
