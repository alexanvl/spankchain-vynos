import * as React from 'react'
import { Route, Switch } from 'react-router'
import { connect } from 'react-redux'
import Web3 = require('web3')
import Activity from './Activity'
import AddFundsCallout from './AddFundsCallout'
import SpankCard from './SpankCard'
import SendCurrency from './SendCurrency'
import Receive from './Receive'
import RevealPrivateKey from './RevealPrivateKey'
import { FrameState } from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import BN = require('bn.js')

const s = require('./styles.css')
const st = require('./index.css')

export interface WalletPageStateProps {
  path: string
  web3: Web3
  workerProxy: WorkerProxy
  address: string | null
  walletBalance: BN
  cardBalance: BN
  location?: any
}

export interface WalletPageState {
  isPopulatingChannels: boolean
  channelPopulationError: string
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {
  state = {
    isPopulatingChannels: true,
    channelPopulationError: ''
  }

  async componentDidMount() {
    this.setState({
      isPopulatingChannels: false,
    })
  }

  closeFrame = () => {
    const { workerProxy } = this.props
    workerProxy.toggleFrame(false)
  }

  renderMainPage() {
    return (
      <Route
        path="/wallet"
        render={() => {
          if (this.state.isPopulatingChannels || this.state.channelPopulationError) {
            return this.renderLoadingOrError()
          }
          return <SpankCard />
        }}
      />
    )
  }

  renderSubPage() {
    const { address } = this.props

    return (
      <Switch>
        <Route
          exact
          path="/wallet/activity"
          component={Activity}
        />
        <Route
          exact
          path="/wallet/send"
          component={SendCurrency}
        />
        <Route
          path="/wallet/receive"
          render={() => <Receive address={address!} location={this.props.location}/>}
        />
        <Route
          path="/wallet/reveal"
          render={() => <RevealPrivateKey />}
        />
        <Route
          path="/wallet"
          render={() => this.props.cardBalance.eq(new BN(0)) ? <AddFundsCallout /> : null}
        />
      </Switch>

    )
  }

  render() {
    if (!this.props.address) {
      return <noscript />
    }

    return (
      <div className={s.walletWrapper}>
        <div className={s.cover} onClick={this.closeFrame} />
        <div className={s.walletContentContainer}>
          {this.renderMainPage()}
          {this.renderSubPage()}
        </div>
      </div>
    )
  }

  renderLoadingOrError() {
    if (this.state.channelPopulationError) {
      return (
        <div className={s.walletRow}>
          {this.state.channelPopulationError}
        </div>
      )
    }

    return (
      <div className={s.walletRow}>
        <div className={st.loaderRow}>
          <div className={st.spinnerWrapper}>
            <div className={st.spinner} />
          </div>
          <div className={st.loaderText}>
            Loading...
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): WalletPageStateProps {
  let workerProxy = state.temp.workerProxy!
  return {
    path: state.shared.rememberPath,
    web3: workerProxy.getWeb3(),
    workerProxy: workerProxy,
    address: state.shared.address,
    walletBalance: new BN(state.shared.balance),
    cardBalance: new BN(state.shared.channel ? state.shared.channel.balance : 0),
  }
}

export default connect(mapStateToProps)(WalletPage)
