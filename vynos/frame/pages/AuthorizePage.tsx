import * as React from 'react'
import {connect} from 'react-redux'
import WorkerProxy from '../WorkerProxy'
import {FrameState} from '../redux/FrameState'
import {AuthorizationRequestState} from '../../worker/WorkerState'
import Button from '../components/Button/index'
import {RouteComponentProps, withRouter} from 'react-router'

const s = require('./WalletPage/styles.css')

export interface StateProps {
  workerProxy: WorkerProxy
  authRequest: AuthorizationRequestState | null
}

export interface AuthorizePageProps extends RouteComponentProps<any>, StateProps {}

export interface AuthorizePageState {
  authRealm: string
  hasError: boolean
  isAuthenticating: boolean
}

export class AuthorizePage extends React.Component<AuthorizePageProps, AuthorizePageState> {
  constructor (props: AuthorizePageProps) {
    super(props)

    this.state = {
      authRealm: props.authRequest ? props.authRequest.authRealm : '',
      hasError: false,
      isAuthenticating: false
    }
  }

  componentWillReceiveProps (nextProps: StateProps) {
    if (!nextProps.authRequest) {
      return
    }

    this.setState({
      authRealm: nextProps.authRequest.authRealm
    })
  }

  async onClickResponse (res: boolean) {
    this.setState({
      isAuthenticating: true
    })

    if (res) {
      this.props.workerProxy.finishAuthentication()
        .then(() => this.props.workerProxy.toggleFrame(false))
        .then(() => this.props.history.push('/wallet'))
        .catch(() => this.setState({
          hasError: true,
          isAuthenticating: false
        }))
    } else {
      this.props.workerProxy.toggleFrame(false)
      this.props.history.push('/wallet')
      this.props.workerProxy.respondToAuthorizationRequest(false)
    }
  }

  render () {
    return (
      <div className={s.walletWrapper}>
        <div className={s.walletRow}>
          {
            this.state.hasError ?
              'An error occurred while authenticating. Please try again.' :
              `Are you sure you want to authenticate to ${this.state.authRealm}?`
          }
        </div>
        <div className={s.walletRow}>
          <Button
            type="secondary"
            onClick={() => this.onClickResponse(false)}
            content="No"
            disabled={this.state.isAuthenticating}
            isMini
          />
          <Button
            type="primary"
            onClick={() => this.onClickResponse(true)}
            content={this.state.isAuthenticating ? 'Authenticating...' : 'Yes'}
            isMini
            disabled={this.state.isAuthenticating}
          />
        </div>
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    authRequest: state.shared.authorizationRequest
  }
}

export default withRouter(connect(mapStateToProps)(AuthorizePage))
