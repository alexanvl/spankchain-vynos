import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../redux/FrameState'
import Button from '../../components/Button/index'
import WorkerProxy from '../../WorkerProxy'
import * as BigNumber from 'bignumber.js';
import Currency, {CurrencyType} from '../../components/Currency/index'

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

    const gasPrice = await this.getGasPrice()
    const gasCost = new BigNumber.BigNumber(gasPrice).times(300000)

    const amount = new BigNumber.BigNumber(this.props.walletBalance!)
      .minus(gasCost)

    await this.props.workerProxy.openChannelWithCurrentHub(amount)
  }

  private async getGasPrice(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.props.workerProxy.web3.eth.getGasPrice((err: any, data: any) => {
        return err
          ? reject(err)
          : resolve(data)
      })
    })
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
    if (this.state.isLoading) {
      return 'Loading...'
    }

    return (
      <span>
        Load up <Currency amount={this.props.walletBalance} inputType={CurrencyType.WEI} /> into SpankCard
      </span>
    )
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    walletBalance: state.shared.balance,
    cardTitle: state.shared.branding.title,
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(LoadUpSpank)
