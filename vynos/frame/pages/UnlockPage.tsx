import * as React from 'react'
import {ChangeEvent, FormEvent} from 'react'
import {connect} from 'react-redux'
import WorkerProxy from '../WorkerProxy'
import postMessage from '../lib/postMessage'
import {FrameState} from '../redux/FrameState'
import RestorePage from './RestorePage'
import Button from '../components/Button/index'
import TextBox from '../components/TextBox/index'
import Input from '../components/Input/index'
import WalletCard from '../components/WalletCard/index'
import WalletMiniCard from '../components/WalletMiniCard/index'
import {RouteComponentProps, withRouter} from 'react-router'
import _ = require('lodash')

const style = require('../styles/ynos.css')

export interface StateProps {
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
};

export class UnlockPage extends React.Component<UnlockPageProps, UnlockPageState> {
  constructor (props: UnlockPageProps) {
    super(props)
    this.state = {
      password: '',
      passwordError: null,
      loading: false,
      displayRestore: false
    }
    this.handleChangePassword = this.handleChangePassword.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.doDisplayRestore = this.doDisplayRestore.bind(this)
  }

  handleChangePassword (event: ChangeEvent<HTMLInputElement>) {
    let value = event.target.value
    this.setState({
      password: value,
      passwordError: null
    })
  }

  async handleSubmit (ev: FormEvent<HTMLFormElement>) {
    this.setState({loading: true})

    const password = _.toString(this.state.password)

    let passwordError = null

    try {
      await this.props.workerProxy.doUnlock(password)
    } catch (err) {
      passwordError = err
    }

    if (passwordError) {
      this.setState({
        passwordError
      })
      return
    }

    const next = this.props.next || '/wallet'

    this.props.history.push(next)
  }

  doDisplayRestore () {
    this.setState({
      displayRestore: true
    })
  }

  doneDisplayRestorePage () {
    this.setState({
      displayRestore: false
    })
  }

  closeView () {
    this.props.workerProxy.toggleFrame(false)
  }

  render () {
    if (this.state.displayRestore) {
      return <RestorePage goBack={this.doneDisplayRestorePage.bind(this)} />
    }

    return (
      <div className={style.fullContainer}>
        <div className={style.loginHeader}>
          <WalletMiniCard
            className={style.loginWalletMiniCard}
            onClick={this.closeView}
            isLocked
            inverse
            alwaysLarge
          />
        </div>
        <div className={style.content}>
          <WalletCard
            width={275}
            cardTitle="SpankCard"
            companyName="SpankChain"
            name="spanktoshi"
            className={style.funnelWalletCard}
          />
          <div className={style.funnelTitle}>Login to SpankCard</div>
          <TextBox className={style.passwordTextBox}>
            We see you already have a SpankWallet, please login.
          </TextBox>
          <Input
            placeholder="Password"
            type="password"
            className={style.passwordInput}
            onChange={this.handleChangePassword}
          />
          <div className={style.funnelFooter}>
            <Button
              type="secondary"
              content="Restore SpankWallet"
              onClick={this.doDisplayRestore}
              isInverse
              isMini
            />
            <Button
              content="Next"
              onClick={this.handleSubmit}
              isInverse
              isMini
            />
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default withRouter(connect<StateProps, undefined, any>(mapStateToProps)(UnlockPage))
