import * as React from 'react'
import { ChangeEvent, MouseEvent } from 'react'
import { Dispatch } from 'redux'
import { FrameState } from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import { connect } from 'react-redux'
import * as actions from '../../redux/actions'
import { MINIMUM_PASSWORD_LENGTH, PASSWORD_CONFIRMATION_HINT_TEXT, PASSWORD_HINT_TEXT } from '../../constants'
import RestorePage from '../RestorePage'
import Button from '../../components/Button/index'
import TextBox from '../../components/TextBox/index'
import Input from '../../components/Input/index'
import OnboardingContainer from './OnboardingContainer'
import Submittable from '../../components/Submittable'

const style = require('../../styles/ynos.css')

export interface PasswordState {
  password: string
  passwordConfirmation: string
  passwordError: null | string
  passwordConfirmationError: null | string
  displayRestore: boolean
}

export interface PasswordSubpageStateProps {
  workerProxy: WorkerProxy
  isPerformer?: boolean
}

export interface PasswordSubpageDispatchProps {
  genKeyring: (workerProxy: WorkerProxy, password: string) => void
}

export type PasswordSubpageProps = PasswordSubpageStateProps & PasswordSubpageDispatchProps

export class Password extends React.Component<PasswordSubpageProps, PasswordState> {
  state = {
    password: '',
    passwordConfirmation: '',
    passwordError: null,
    passwordConfirmationError: null,
    displayRestore: false
  } as PasswordState

  isValid = () => {
    let passwordError = this.state.passwordError
    if (this.state.password.length < MINIMUM_PASSWORD_LENGTH) {
      passwordError = PASSWORD_HINT_TEXT
      this.setState({
        passwordError: passwordError
      })
    }
    let passwordConfirmationError = this.state.passwordConfirmationError
    if (this.state.passwordConfirmation !== this.state.password && this.state.password) {
      passwordConfirmationError = PASSWORD_CONFIRMATION_HINT_TEXT
      this.setState({
        passwordConfirmationError: passwordConfirmationError
      })
    }
    return !(passwordError || passwordConfirmationError)
  }

  handleSubmit = (e: any) => {
    if (this.isValid() && this.state.password) {
      return this.props.genKeyring(this.props.workerProxy, this.state.password)
    }
  }

  handleChangePassword = (ev: ChangeEvent<EventTarget>) => {
    let value = (ev.target as HTMLInputElement).value
    this.setState({
      password: value,
      passwordError: null,
      passwordConfirmationError: null
    })
  }

  handleChangePasswordConfirmation = (ev: ChangeEvent<EventTarget>) => {
    let value = (ev.target as HTMLInputElement).value
    this.setState({
      passwordConfirmation: value,
      passwordError: null,
      passwordConfirmationError: null
    })
  }

  doneDisplayRestorePage = () => {
    this.setState({
      displayRestore: false
    })
  }

  getText = () => this.props.isPerformer
    ? 'Welcome to your new SpankPay account! Before you can start getting paid with crypto, you\'ll need to protect your account with a password'
    : 'Welcome to your new SpankPay account! Before you can start tipping with crypto, you\'ll need to protect your account with a password'

  render() {
    const { isPerformer } = this.props

    if (this.state.displayRestore)
      return <RestorePage goBack={this.doneDisplayRestorePage.bind(this)} />

    return (
      <OnboardingContainer
        headerText={isPerformer ? 'Become a Model' : ''}
        totalSteps={isPerformer ? 3 : 4}
        currentStep={0}
      >
        <div className={style.content}>
          <div className={style.funnelTitle}>Your SpankPay Account</div>
          <TextBox className={style.passwordTextBox}>
            {this.getText()}
          </TextBox>
          <Submittable onSubmit={this.handleSubmit} className={style.submittable}>
            <Input
              placeholder="New Password"
              type="password"
              className={style.passwordInput}
              onChange={this.handleChangePassword}
              errorMessage={this.state.passwordError}
              inverse
              name="signupNewPasswordInput"
            />
            <Input
              placeholder="Confirm Password"
              type="password"
              className={style.passwordInput}
              onChange={this.handleChangePasswordConfirmation}
              errorMessage={this.state.passwordConfirmationError}
              inverse
              name="signupConfirmPasswordInput"
            />
            <div className={style.funnelFooter}>
              <Button
                type="secondary"
                content="Restore SpankWallet"
                onClick={() => this.setState({ displayRestore: true })}
                isInverse
                name="restoreWalletButton"
              />
              <Button
                content="Next"
                onClick={this.handleSubmit}
                isInverse
                isSubmit
                name="signupSetPasswordButton"
              />
            </div>
          </Submittable>
        </div>
      </OnboardingContainer>
    )
  }
}

function mapStateToProps(state: FrameState): PasswordSubpageStateProps {
  return {
    workerProxy: state.temp.workerProxy,
    isPerformer: state.shared.isPerformer,
  }
}

function mapDispatchToProps(dispatch: Dispatch): PasswordSubpageDispatchProps {
  return {
    genKeyring: (workerProxy, password) => {
      workerProxy.genKeyring(password).then(mnemonic => {
        dispatch(actions.didReceiveMnemonic(mnemonic))
      })
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Password)
