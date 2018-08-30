import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../redux/FrameState'
import Button from '../../components/Button/index'
import WorkerProxy from '../../WorkerProxy'
import * as BigNumber from 'bignumber.js';
import Currency, {CurrencyType} from '../../components/Currency/index'
import entireBalance from '../../lib/entireBalance'
import BN = require('bn.js')

const s = require('./LoadUpSpank.css')

const finneyInverse = require('../../components/CurrencyIcon/style.css').inverse

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

    const amount = await entireBalance(this.props.workerProxy, new BN(this.props.walletBalance!))
    await this.props.workerProxy.deposit(amount)
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
      <span className={s.loadUpCta}>
        <span>Load up</span>
        <Currency
          className={s.currency}
          amount={this.props.walletBalance}
          inputType={CurrencyType.WEI}
          outputType={CurrencyType.FINNEY}
          unitClassName={`${finneyInverse} ${s.finney}`}
          showUnit
        />
        <span>into SpankCard</span>
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
