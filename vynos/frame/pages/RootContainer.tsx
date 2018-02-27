import * as React from 'react'
import {Route, Switch, withRouter} from 'react-router-dom'
import {connect} from 'react-redux'
import {FrameState} from '../redux/FrameState'
import InitPage from './InitPage'
import UnlockPage from './UnlockPage'
import WalletPage from './WalletPage'
import ApprovePage from '../components/WalletPage/ApprovePage'
import {RouteComponentProps} from 'react-router'
import AuthorizePage from './AuthorizePage'
import postMessage from "../lib/postMessage"

export interface StateProps {
  isAuthorizationExpected: boolean
  isWalletExpected: boolean
  isUnlockExpected: boolean
  isTransactionPending: boolean
}

export interface RootStateProps extends RouteComponentProps<any>, StateProps {
}

export type RootContainerProps = RootStateProps

export class RootContainer extends React.Component<RootContainerProps, any> {
  componentDidMount () {
    this.determineRoute()
  }

  componentWillReceiveProps (nextProps: RootStateProps) {
    if (this.props.isUnlockExpected === nextProps.isUnlockExpected &&
      this.props.isWalletExpected === nextProps.isWalletExpected &&
      this.props.isTransactionPending === nextProps.isTransactionPending &&
      this.props.isAuthorizationExpected === nextProps.isAuthorizationExpected) {
      return
    }

    this.determineRoute(nextProps)
  }

  determineRoute (props?: RootContainerProps) {
    props = props || this.props

    if (props.isUnlockExpected) {
      this.props.history.push('/unlock')
      return
    }

    if (props.isAuthorizationExpected) {
      this.props.history.push('/authorize')
    }

    if (props.isTransactionPending) {
      this.props.history.push('/approve')
    }

    if (!props.isWalletExpected) {
      this.props.history.push('/init')
    }
  }

  render () {
    return (
      <Switch>
        <Route path="/approve" component={ApprovePage} />

        <Route path="/authorize" component={AuthorizePage} />

        <Switch>
          <Route exact path="/wallet" component={WalletPage} />
          <Route exact path="/unlock" render={() => <UnlockPage next={this.props.isAuthorizationExpected ? '/authenticate' : '/wallet'}/>} />
          <Route path="/init" component={InitPage} />
        </Switch>

        <Route path="/" render={() => null} />
      </Switch>
    )
  }

  hide() {
    postMessage(window, {
      type: 'vynos/parent/hideFull'
    })

    return null
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    isAuthorizationExpected: !!state.shared.authorizationRequest,
    isUnlockExpected: state.shared.didInit && state.shared.isLocked,
    isWalletExpected: state.shared.didInit && !state.shared.isLocked && !state.temp.initPage.showInitialDeposit,
    isTransactionPending: state.shared.didInit && state.shared.isTransactionPending !== 0
  }
}

export default withRouter(connect<StateProps, undefined, any>(mapStateToProps)(RootContainer))
