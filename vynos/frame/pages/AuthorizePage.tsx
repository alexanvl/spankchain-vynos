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
}

export class AuthorizePage extends React.Component<AuthorizePageProps, AuthorizePageState> {
  constructor (props: AuthorizePageProps) {
    super(props)

    this.state = {
      authRealm: props.authRequest ? props.authRequest.authRealm : ''
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
    await this.props.workerProxy.toggleFrame(false)
    await this.props.workerProxy.respondToAuthorizationRequest(res)
    this.props.history.push('/wallet')
  }

  render () {
    return (
      <div className={s.walletWrapper}>
        <div className={s.walletRow}>
          Are you sure you want to authenticate to {this.state.authRealm}?
        </div>
        <div className={s.walletRow}>
          <Button type="secondary" onClick={() => this.onClickResponse(false)} content="No" isMini />
          <Button type="primary" onClick={() => this.onClickResponse(true)} content="Yes" isMini />
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
