import * as React from 'react'
import { ChangeEvent, FormEvent } from 'react'
import { connect } from 'react-redux'
import WorkerProxy from '../WorkerProxy'
import { FrameState } from '../redux/FrameState'
import RestorePage from './RestorePage'
import Button from '../components/Button/index'
import TextBox from '../components/TextBox/index'
import Input from '../components/Input/index'
import { RouteComponentProps, withRouter } from 'react-router'
import Submittable from '../components/Submittable'
import _ = require('lodash')
import WalletCard from '../components/WalletCard'
import * as classnames from 'classnames';
import { BrandingState } from '../../worker/WorkerState'

const style = require('../styles/ynos.css')
const walletStyle = require('./WalletPage/styles.css')
const pageStyle = require('./UnlockPage.css')

export interface StateProps extends BrandingState {
  workerProxy: WorkerProxy
}

export interface UnlockPageProps extends RouteComponentProps<any>, StateProps {
  next?: string
}

export type UnlockPageState = {
  password: string
  passwordError: string | null
  loading: boolean
  displayRestore: boolean
  isResetting: boolean
};

export class UnlockPage extends React.Component<UnlockPageProps, UnlockPageState> {
  state = {
    password: '',
    passwordError: null,
    loading: false,
    displayRestore: false,
      isResetting: false
  } as UnlockPageState

  handleChangePassword = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      password: event.target.value,
      passwordError: null
    })
  }

  handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    this.setState({ loading: true })

    const password = _.toString(this.state.password)

    let passwordError = null

    try {
      await this.props.workerProxy.doUnlock(password)
    } catch (err) {
      passwordError = err.message
    }

    if (passwordError) {
      this.setState({
        passwordError,
        loading: false
      })
      return
    }

    await this.props.workerProxy.authenticate()
    const next = this.props.next || '/wallet'
    this.props.history.push(next)
  }

  onClickReset () {
    if (!this.state.isResetting) {
      this.setState({
        isResetting: true
      })

      return
    }

    this.props.workerProxy.reset()
  }

  doDisplayRestore = () => {
    this.setState({
      displayRestore: true
    })
  }

  doneDisplayRestorePage = () => {
    this.setState({
      displayRestore: false
    })
  }

  closeView = () => this.props.workerProxy.toggleFrame(false)

  render() {
    if (this.state.displayRestore) {
      return <RestorePage goBack={this.doneDisplayRestorePage.bind(this)} />
    }

    return (
      <div className={walletStyle.walletWrapper}>
        <div className={classnames(walletStyle.walletRow, pageStyle.walletCardWrapper)}>
          <div className={pageStyle.close} onClick={this.closeView} />
          <div className={pageStyle.walletCard}>
            <WalletCard
              cardTitle={this.props.title}
              companyName={this.props.companyName}
              backgroundColor={this.props.backgroundColor}
              color={this.props.textColor}
              className={classnames(walletStyle.walletSpankCard, pageStyle.walletSpankCard)}
              gradient
            />
          </div>
        </div>
        <div className={classnames(walletStyle.walletRow, pageStyle.afterWalletCardWrapper)}>
          <div className={classnames(style.content, pageStyle.content)}>
            <div className={pageStyle.header}>Unlock your SpankPay account</div>
            <TextBox className={style.passwordTextBox} isInverse>
              Enter your password below. Forgot your password? No worries, just dig up those backup words you saved when you created your account, and Restore that bad boy.
            </TextBox>
            <Submittable onSubmit={this.handleSubmit}>
              <Input
                placeholder="Password"
                type="password"
                className={style.passwordInput}
                onChange={this.handleChangePassword}
                errorMessage={this.state.passwordError}
                autoFocus
              />
              <div className={style.funnelFooter}>
                <Button
                  type="secondary"
                  content="Restore SpankCard"
                  onClick={this.doDisplayRestore}
                  isMini
                />
                <Button
                  content={() => (
                    this.state.loading ? 'Unlocking...' : <div className={style.loginButton} />
                  )}
                  onClick={this.handleSubmit}
                  disabled={this.state.loading}
                  isMini
                  isSubmit
                />
              <div className={style.resetText}>
              </div>
              <span onClick={this.onClickReset}>
                {this.state.isResetting ? 'Are you sure? This will permanently erase your wallet.' : 'Reset'}
              </span>
              </div>
            </Submittable>
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    ...state.shared.branding
  }
}

export default withRouter(connect(mapStateToProps)(UnlockPage))
