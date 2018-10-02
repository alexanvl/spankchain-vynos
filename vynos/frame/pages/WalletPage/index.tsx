import * as React from 'react'
import { Route, Switch } from 'react-router'
import { connect } from 'react-redux'
import Activity from './Activity'
import AddFundsCallout from './AddFundsCallout'
import SpankCard from './SpankCard'
import SendCurrency from './SendCurrency'
import Receive from './Receive'
import RevealPrivateKey from './RevealPrivateKey'
import { FrameState } from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import BN = require('bn.js')
import {FeatureFlags, MigrationState} from '../../../worker/WorkerState'
import {ReactChild} from 'react'

const s = require('./styles.css')
const st = require('./index.css')

export interface WalletPageStateProps {
  workerProxy: WorkerProxy
  address: string | null
  cardBalance: BN
  location?: string
  featureFlags: FeatureFlags|null
  migrationState: MigrationState
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
    const { address, featureFlags } = this.props

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

    if (this.props.migrationState !== 'DONE') {
      return this.renderMigrationStatus()
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

  renderMigrationStatus () {
    let content: ReactChild|null

    if (this.props.migrationState === 'MIGRATING') {
      content = this.renderMigrating()
    } else if (this.props.migrationState === 'AWAITING_ETH') {
      content = this.renderAwaitingEth()
    } else {
      content = null
    }

    return (
      <div className={s.walletWrapper}>
        <div className={s.cover} onClick={this.closeFrame} />
        <div className={s.walletContentContainer}>
          {content}
        </div>
      </div>
    );
  }

  renderMigrating () {
    return (
      <React.Fragment>
        <div className={s.walletMigrationContainer}>
          We got your ETH! Setting up your wallet now...
        </div>
      </React.Fragment>
    )
  }

  renderAwaitingEth () {
    return (
      <React.Fragment>
        <div className={s.walletMigrationContainer}>
          Welcome to your SpankWallet! Send some ETH to the address below to get started.
        </div>
        <Receive address={this.props.address!} location={this.props.location} showRevealPrivateKey={false} />
      </React.Fragment>
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
  const workerProxy = state.temp.workerProxy!
  const channel = state.shared.channel
  return {
    workerProxy: workerProxy,
    address: state.shared.address,
    featureFlags: state.shared.featureFlags,
    cardBalance: new BN(channel.balances.ethBalance.amount),
    migrationState: state.shared.migrationState
  }
}

export default connect(mapStateToProps)(WalletPage)
