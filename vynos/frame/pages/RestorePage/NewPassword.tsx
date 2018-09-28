import * as React from 'react';
import TextBox from '../../components/TextBox/index'
import Input from '../../components/Input/index'
import Button from '../../components/Button/index'
import {ChangeEvent} from 'react'
import {MINIMUM_PASSWORD_LENGTH} from '../../constants'

const style = require('../../styles/ynos.css')

export interface NewPasswordProps {
  message?: string
  isAndroid: boolean
  goBack: () => void
  onSubmit: (password: string) => void
}

export interface NewPasswordState {
  message: string
  password: string
  passwordError: string
  passwordConfirmation: string
  passwordConfirmationError: string
  [k: string]: string
}

export default class NewPassword extends React.Component<NewPasswordProps, NewPasswordState> {
  state = {
    message: '',
    password: '',
    passwordError: '',
    passwordConfirmation: '',
    passwordConfirmationError: ''
  } as NewPasswordState


  componentWillReceiveProps(nextProps: NewPasswordProps) {
    if (nextProps.message) {
      this.setState({
        message: nextProps.message
      })
    }
  }

  render() {
    return (
      <div className={style.content}>
        <div className={style.funnelTitle}>
          Restore Backup Seed
        </div>
        <TextBox className={style.passwordTextBox}>
          {this.state.message || 'Enter a new password to encrypt your wallet.'}
        </TextBox>
        <div className={style.restorePasswordWrapper}>
          <Input
            placeholder="New Password"
            type="password"
            className={style.passwordInput}
            {...this.fieldUpdater('password')}
            errorMessage={this.state.passwordError}
            inverse
          />
          <Input
            placeholder="Confirm Password"
            type="password"
            className={style.passwordInput}
            {...this.fieldUpdater('passwordConfirmation')}
            errorMessage={this.state.passwordConfirmationError}
            inverse
          />
        </div>
        <div className={`${style.funnelFooter} ${this.props.isAndroid ? style.androidFooter : ''}`}>
          <Button
            type="secondary"
            content="Go Back"
            onClick={this.props.goBack}
            isInverse
          />
          <Button
            content="Next"
            onClick={this.onSubmit}
            isInverse
          />
        </div>
      </div>
    )
  }

  fieldUpdater = (name: string) => ({
    onChange: (e: ChangeEvent<HTMLInputElement>) => this.setState({ [name]: e.target.value })
  })

  onSubmit = () => {
    if (!this.state.password || this.state.password.length < MINIMUM_PASSWORD_LENGTH) {
      return this.setState({
        passwordError: 'Password is too short.'
      })
    }

    if (this.state.passwordConfirmation !== this.state.password || !this.state.passwordConfirmation) {
      return this.setState({
        passwordConfirmationError: 'Passwords do not match.'
      })
    }

    this.props.onSubmit(this.state.password)
  }
}
