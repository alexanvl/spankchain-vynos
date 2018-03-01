import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../redux/FrameState'
import Button from '../../components/Button/index'
import WorkerProxy from '../../WorkerProxy'
import * as BigNumber from 'bignumber.js';

const s = require('./LoadUpSpank.css')


export interface StateProps {
  walletBalance: string | null
  cardTitle?: string
  workerProxy: WorkerProxy
}

export type LoadUpSpankProps = StateProps

export interface LoadUpSpankState {
  isLoading: boolean
}

export class LoadUpSpank extends React.Component<LoadUpSpankProps, LoadUpSpankState> {
  constructor (props: LoadUpSpankProps) {
    super(props)

    this.state = {
      isLoading: false
    }
  }

  async load () {
    this.setState({
      isLoading: true
    })

    const amount = new BigNumber.BigNumber(this.props.workerProxy.web3.toWei(this.props.walletBalance!, 'ether'))
      .minus(this.props.workerProxy.web3.toWei(0.1, 'ether'))
    await this.props.workerProxy.openChannel(amount)
  }

  render () {
    return (
      <div className={s.container}>
        <div className={s.header}>
          You have funds in your wallet, please load up your {this.props.cardTitle}
        </div>
        <div className={s.footer}>
          <Button content={this.renderContent()} disabled={this.state.isLoading} onClick={() => this.load()} />
        </div>
      </div>
    )
  }

  renderContent () {
    return this.state.isLoading ? 'Loading...' : `Load up $${this.props.walletBalance} into SpankCard`
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    walletBalance: state.wallet.main.balance,
    cardTitle: state.shared.branding.title,
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(LoadUpSpank)
