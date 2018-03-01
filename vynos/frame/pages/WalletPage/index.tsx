import * as React from 'react'
import {nameByPath} from './WalletMenu'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import WorkerProxy from '../../WorkerProxy'
import ActivitySubpage from './ActivitySubpage'
import SendReceivePage from './SendReceivePage'
import SpankCardPage from './CardPage'
import {Route, Switch} from 'react-router'
import SendReceiveWrapper from './SendReceiveWrapper'
import Web3 = require('web3')

const s = require('./styles.css')

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
  address: string
  walletBalance: string
}

export interface WalletPageState {
  spankBalance: string
  sendShown: boolean
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {
  constructor (props: any) {
    super(props)
    this.state = {
      // TODO: backend integration to retrieve SpankCard balance
      spankBalance: '23',
      sendShown: false
    }
  }

  renderMainPage () {
    const { walletBalance, address } = this.props
    const { spankBalance } = this.state

    return (
      <Switch>
        <Route
          path="/wallet/(send|receive)"
          render={() => (
            <SendReceivePage
              balance={walletBalance}
              address={address}
            />
          )}
        />
        <Route
          path="/wallet"
          render={() => (
            <SpankCardPage spankBalance={spankBalance} />
          )}
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
    if (!this.props.walletBalance) {
      return <noscript />
    }

    return (
      <div className={s.walletWrapper}>
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
    walletBalance: state.wallet.main.balance!,
  }
}

export default connect(mapStateToProps)(WalletPage)
