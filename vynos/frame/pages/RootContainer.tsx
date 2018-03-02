import * as React from 'react'
import {Route, Switch, withRouter} from 'react-router-dom'
import {connect} from 'react-redux'
import {Dispatch} from 'redux'
import Web3 = require('web3')
import {FrameState} from '../redux/FrameState'
import InitPage from './InitPage'
import UnlockPage from './UnlockPage'
import WalletPage from './WalletPage'
import ApprovePage from '../components/WalletPage/ApprovePage'
import {RouteComponentProps} from 'react-router'
import AuthorizePage from './AuthorizePage'
import postMessage from "../lib/postMessage"
import * as actions from "../redux/actions";
import WorkerProxy from '../WorkerProxy';

export interface StateProps {
  isAuthorizationExpected: boolean
  isWalletExpected: boolean
  isUnlockExpected: boolean
  isTransactionPending: boolean
  isFrameDisplayed: boolean
  forceRedirect?: string
  web3: Web3
  workerProxy: WorkerProxy
}

export interface RootStateProps extends RouteComponentProps<any>, StateProps {
}

export interface RootDispatchProps {
  updateBalance: (balance: string) => void
  updateAddress: (address: string) => void
}

export type RootContainerProps = RootStateProps & RootDispatchProps

export class RootContainer extends React.Component<RootContainerProps, any> {
  componentWillMount() {
    this.startWatching()
  }

  componentDidMount () {
    this.determineRoute()
  }

  async startWatching() {

    await this.props.workerProxy.watchWalletBalance()
  }

  closeWallet = () => {
    postMessage(window, {
      type: 'vynos/parent/hide',
    })
  }

  componentWillReceiveProps (nextProps: RootStateProps) {
    if (this.props.isUnlockExpected === nextProps.isUnlockExpected &&
      this.props.isWalletExpected === nextProps.isWalletExpected &&
      this.props.isTransactionPending === nextProps.isTransactionPending &&
      this.props.isAuthorizationExpected === nextProps.isAuthorizationExpected &&
      this.props.isFrameDisplayed === nextProps.isFrameDisplayed &&
      this.props.forceRedirect === nextProps.forceRedirect) {
      return
    }

    this.determineRoute(nextProps)
  }

  determineRoute (props?: RootStateProps) {
    props = props || this.props


    if (props.isUnlockExpected) {
      this.props.history.push('/unlock')
      return
    }

    if (props.isAuthorizationExpected) {
      this.props.history.push('/authorize')
      return
    }

    if (props.isTransactionPending) {
      this.props.history.push('/approve')
      return
    }

    if (!props.isWalletExpected) {
      this.props.history.push('/init')
      return
    }

    if (props.isWalletExpected) {
      if (props.forceRedirect) {
        this.props.history.push(props.forceRedirect)
        return
      }
      this.props.history.push('/wallet')
      return
    }

    if (!props.isFrameDisplayed) {
      this.props.history.push('/wallet')
      return
    }

  }

  render () {
    return (
      <Switch>
        <Route path="/approve" component={ApprovePage} />

        <Route path="/authorize" component={AuthorizePage} />

        <Switch>
          <Route path="/(wallet|card)" component={WalletPage} />
          <Route exact path="/unlock" render={() => <UnlockPage next={this.props.isAuthorizationExpected ? '/authenticate' : '/wallet'}/>} />
          <Route path="/init" component={InitPage} />
        </Switch>

        <Route path="/" render={() => null} />
      </Switch>
    )
  }
}

function mapStateToProps (state: FrameState): StateProps {
  let workerProxy = state.temp.workerProxy
  return {
    workerProxy,
    isFrameDisplayed: state.shared.isFrameDisplayed,
    forceRedirect: state.shared.forceRedirect,
    isAuthorizationExpected: !!state.shared.authorizationRequest,
    web3: workerProxy.getWeb3(),
    isUnlockExpected: state.shared.didInit && state.shared.isLocked,
    isWalletExpected: state.shared.didInit && !state.shared.isLocked && !state.temp.initPage.showInitialDeposit,
    isTransactionPending: state.shared.didInit && state.shared.isTransactionPending !== 0
  }
}

function mapDispatchToProps(dispatch: Dispatch<FrameState>): RootDispatchProps {
  return {
    updateBalance: (balance: string) => dispatch(actions.updateBalance(balance)),
    updateAddress: (address: string) => dispatch(actions.updateAddress(address)),
  }
}

export default withRouter(
  connect<StateProps, RootDispatchProps, any>(mapStateToProps, mapDispatchToProps)(RootContainer)
)
