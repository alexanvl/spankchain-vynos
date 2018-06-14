import * as React from 'react'
import {Route, Switch} from 'react-router'
import {connect} from 'react-redux'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'

import {nameByPath} from './WalletMenu'
import ActivitySubpage from './ActivitySubpage'
import SendReceivePage from './SendReceivePage'
import SpankCardPage from './CardPage'
import MainEntry from './MainEntry/index'
import SendReceiveWrapper from './SendReceiveWrapper'
import RevealPrivateKey from './RevealPrivateKey'
import WalletCTAButton from './WalletCTAButton/index'
import LoadCardCTAButton from './LoadCardCTAButton/index'
import LoadUpSpank from './LoadUpSpank'
import {cardBalance} from '../../redux/selectors/cardBalance'
import {FrameState} from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'

const s = require('./styles.css')
const st = require('./index.css')

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
  address: string|null
  walletBalance: BigNumber.BigNumber
  cardBalance: BigNumber.BigNumber
}

export interface WalletPageState {
  isPopulatingChannels: boolean
  channelPopulationError: string
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {
  constructor(props: WalletPageStateProps) {
    super(props)

    this.state = {
      isPopulatingChannels: true,
      channelPopulationError: ''
    }
  }

  async componentDidMount() {
    let channelPopulationError = ''

    try {
      await this.props.workerProxy.populateChannels()
    } catch (e) {
      channelPopulationError = 'Failed to load wallet. Please check your internet connection and refresh your browser.'
    }

    this.setState({
      isPopulatingChannels: false,
      channelPopulationError
    })
  }

  closeFrame = () => {
    const { workerProxy } = this.props
    workerProxy.toggleFrame(false)
  }

  renderMainPage () {
    const { walletBalance } = this.props

    return (
      <Switch>
        <Route
          exact
          path="/card/to/wallet"
          component={SendReceivePage}
        />
        <Route
          exact
          path="/card/insufficient"
          render={() => (
            walletBalance.gt(0)
              ? <SpankCardPage />
              : <SendReceivePage />
          )}
        />
        <Route
          path="/wallet/(send|receive)"
          component={SendReceivePage}
        />
        <Route
          path="/wallet"
          render={() => {
            if (this.state.isPopulatingChannels || this.state.channelPopulationError) {
              return this.renderLoadingOrError()
            }

            return <MainEntry />
          }}
        />
      </Switch>
    )
  }

  renderSubPage () {
    const {address, walletBalance} = this.props

    return (
      <Switch>
        <Route
          exact
          path="/card/to/wallet"
          render={() => (
            <WalletCTAButton
              to="/wallet"
            />
          )}
        />
        <Route
          exact
          path="/card/insufficient"
          render={() => (
            walletBalance.gt(0)
              ? <LoadUpSpank />
              : <SendReceiveWrapper address={address!} balance={this.props.walletBalance} />
          )}
        />
        <Route
          exact
          path="/wallet/activity"
          component={ActivitySubpage}
        />
        <Route
          path="/wallet/(send|receive)"
          render={() => <SendReceiveWrapper address={address!} balance={this.props.walletBalance} />}
        />
        <Route
          path="/wallet/reveal"
          render={() => <RevealPrivateKey  />}
        />
        <Route
          exact
          path="/wallet"
          render={() => {
            if (this.state.isPopulatingChannels || this.state.channelPopulationError) {
              return null
            }

            return <LoadCardCTAButton />
          }}
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
        <div className={s.walletContentContainer}>
          {this.renderMainPage()}
          {this.renderSubPage()}
        </div>
      </div>
    )
  }

  renderLoadingOrError () {
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

function mapStateToProps (state: FrameState): WalletPageStateProps {
  let workerProxy = state.temp.workerProxy!
  return {
    name: nameByPath(state.shared.rememberPath),
    path: state.shared.rememberPath,
    web3: workerProxy.getWeb3(),
    workerProxy: workerProxy,
    address: state.shared.address,
    walletBalance: new BigNumber.BigNumber(state.shared.balance),
    cardBalance: cardBalance(state.shared),
  }
}

export default connect(mapStateToProps)(WalletPage)
