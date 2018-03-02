import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import Button from '../../../components/Button/index'
import Currency, {CurrencyType} from '../../../components/Currency/index'
import * as BigNumber from 'bignumber.js';

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

    const amount = new BigNumber.BigNumber(this.props.workerProxy.web3.toWei(this.props.walletBalance!, 'ether'))
      .minus(this.props.workerProxy.web3.toWei(0.1, 'ether'))
    await this.props.workerProxy.openChannelWithCurrentHub(amount)
  }

  renderContent () {
    return this.state.isLoading
      ? 'Loading...'
      : () => (
        <span>
          <span>Load up </span>
          <Currency
            amount={new BigNumber.BigNumber(this.props.walletBalance || 0)}
            inputType={CurrencyType.ETH}
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

    return (
      <div className={s.container}>
        <Button
          content={this.renderContent()}
          disabled={this.state.isLoading}
          onClick={this.load}
        />
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    walletBalance: state.wallet.main.balance,
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(LoadCardCTAButton)