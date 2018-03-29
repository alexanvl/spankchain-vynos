import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import Button from '../../../components/Button/index'
import Currency, {CurrencyType} from '../../../components/Currency/index'
import * as BigNumber from 'bignumber.js';
import * as classnames from 'classnames';
import entireBalance from '../../../lib/entireBalance'

const s = require('./index.css')

export interface MapStateToProps {
  workerProxy: WorkerProxy
  walletBalance: string | null
  cardBalance: BigNumber.BigNumber
}

export type Props = MapStateToProps

export interface State {
  isLoading: boolean
}


export class LoadCardCTAButton extends React.Component<Props, State> {
  state = {
    isLoading: false,
  }

  load = async () => {
    this.setState({
      isLoading: true
    })

    const amount = await entireBalance(this.props.workerProxy, new BigNumber.BigNumber(this.props.walletBalance!))
    await this.props.workerProxy.deposit(amount)
  }

  renderContent () {
    return this.state.isLoading
      ? <span className={s.loaderWrapper}><span className={s.spCircle} /> <span>Card is being filled</span></span>
      : () => (
        <span className={s.loadUpWrapper}>
          <span>Load up </span>
          <Currency
            amount={this.props.walletBalance}
            inputType={CurrencyType.WEI}
            outputType={CurrencyType.FINNEY}
            className={s.loadUpCurrency}
            showUnit
          />
          <span> into SpankCard</span>
        </span>
      )
  }

  render() {
    const { walletBalance, cardBalance } = this.props

    if (walletBalance === '0' || cardBalance.gt(0)) {
      return <noscript />
    }

    const btnClass = classnames({
      [s.loading]: this.state.isLoading
    })

    return (
      <div className={s.container}>
        <Button
          className={btnClass}
          content={this.renderContent()}
          disabled={this.state.isLoading}
          onClick={this.load}
        />
        {this.state.isLoading ? <span className={s.small}>Estimated time: 30 seconds.</span> : null}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    walletBalance: state.shared.balance,
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(LoadCardCTAButton)
