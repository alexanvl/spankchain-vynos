import * as React from 'react'
import {nameByPath} from './WalletMenu'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import WorkerProxy from '../../WorkerProxy'
import ActivitySubpage from './ActivitySubpage'
import SendReceivePage from './SendReceivePage'
import SpankCardPage from './CardPage'
import MainEntry from './MainEntry/index'
import {Route, Switch} from 'react-router'
import SendReceiveWrapper from './SendReceiveWrapper'
import Web3 = require('web3')
import {cardBalance} from '../../redux/selectors/cardBalance'
import * as BigNumber from 'bignumber.js'

const s = require('./styles.css')

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
  address: string
  walletBalance: BigNumber.BigNumber
  cardBalance: BigNumber.BigNumber
}

export class WalletPage extends React.Component<WalletPageStateProps> {
  closeFrame = () => {
    const { workerProxy } = this.props
    workerProxy.toggleFrame(false)
  }

  renderMainPage () {
    const { walletBalance, cardBalance, address } = this.props
    return (
      <Switch>
        <Route
          path="/wallet/(send|receive)"
          component={SendReceivePage}
        />
        <Route
          path="/wallet"
          component={MainEntry}
        />
      </Switch>
    )
  }

  renderSubPage () {
    const {address} = this.props

    return (
      <Switch>
        <Route
          exact
          path="/wallet/activity"
          component={ActivitySubpage}
        />
        <Route
          path="/wallet/(send|receive)"
          render={() => <SendReceiveWrapper address={address} balance={this.props.walletBalance} />}
        />
      </Switch>
    )
  }

  render () {
    if (!this.props.address) {
      return <noscript />
    }

    return (
      <div className={s.walletWrapper}>
        <div className={s.cover} onClick={this.closeFrame}/>
        {this.renderMainPage()}
        {this.renderSubPage()}
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): WalletPageStateProps {
  let workerProxy = state.temp.workerProxy!
  return {
    name: nameByPath(state.shared.rememberPath),
    path: state.shared.rememberPath,
    web3: workerProxy.getWeb3(),
    workerProxy: workerProxy,
    address: state.wallet.main.address!,
    walletBalance: new BigNumber.BigNumber(state.wallet.main.balance || 0),
    cardBalance: cardBalance(state.shared),
  }
}

export default connect(mapStateToProps)(WalletPage)
