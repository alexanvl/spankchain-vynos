import * as React from 'react'
import {ChangeEvent, ReactNode} from 'react'
import {connect} from 'react-redux'
import WorkerProxy from '../WorkerProxy'
import {FrameState} from '../redux/FrameState'
import OnboardingContainer from './InitPage/OnboardingContainer'
import TextBox from '../components/TextBox/index'
import Input from '../components/Input/index'
import Button from '../components/Button/index'
import bip39 = require('bip39')
import {MINIMUM_PASSWORD_LENGTH} from '../constants'

const style = require('../styles/ynos.css')


export interface RestorePageStateProps {
  workerProxy: WorkerProxy
}

export interface RestorePageProps extends RestorePageStateProps {
  goBack: () => void
}

export interface RestorePageState {
  seeds: string[]
  showingPassword: boolean
  seedError?: string
  password?: string
  passwordConfirmation?: string
  passwordError?: string
  passwordConfirmationError?: string
}

const alpha = /^[a-z]*$/i

class RestorePage extends React.Component<RestorePageProps, RestorePageState> {
  backupFieldInputRefs: any = {}

  constructor (props: RestorePageProps) {
    super(props)

    this.state = {
      seeds: [],
      showingPassword: false
    }

    this.updateSeed = this.updateSeed.bind(this)
    this.handleSubmitSeed = this.handleSubmitSeed.bind(this)
    this.handleSubmitPassword = this.handleSubmitPassword.bind(this)
    this.handleChangePassword = this.handleChangePassword.bind(this)
    this.handleChangePasswordConfirmation = this.handleChangePasswordConfirmation.bind(this)
  }

  updateSeed (i: number, e: any) {
    const value = e.target.value
    this.setSeedWordForIndex(i, value)
  }

  _pendingSeeds: string[] | null = null

  setSeedWordForIndex (i: number, value: string) {
    if (!value.match(alpha)) {
      return
    }

    const seeds = this._pendingSeeds || [].concat(this.state.seeds as any) as string[]
    seeds[i] = value.toLowerCase()

    // Because `setSeedWordForIndex` may be called multiple times before the
    // state is updated, store the pending seed words in `this._pendingSeeds`,
    // then clear that after the state is applied
    this._pendingSeeds = seeds

    this.setState({
      seeds
    }, () => {
      this._pendingSeeds = null
    })
  }

  setSeed (i: number) {
    return {
      value: this.state.seeds[i] || '',
      onChange: (e: KeyboardEvent) => this.updateSeed(i, e)
    }
  }

  handleSubmitSeed () {
    const phrase = this.state.seeds.join(' ')

    if (!bip39.validateMnemonic(phrase)) {
      this.setState({
        seedError: 'Invalid seed phrase. Did you forget or mistype a word?'
      })

      return
    }

    this.setState({
      showingPassword: true
    })
  }

  async handleSubmitPassword () {
    if (!this.state.password || this.state.password.length < MINIMUM_PASSWORD_LENGTH) {
      this.setState({
        passwordError: 'Password is too short.'
      })
      return
    }

    if (this.state.passwordConfirmation !== this.state.password && this.state.passwordConfirmation) {
      this.setState({
        passwordConfirmationError: 'Passwords do not match.'
      })
      return
    }

    try {
      await this.props.workerProxy.restoreWallet(this.state.password!, this.state.seeds.join(' '))
    } catch (e) {
      this.setState({
        passwordError: e.message
      })

      return
    }

    this.props.goBack()
    await this.props.workerProxy.authenticate()
  }

  handleChangePassword (ev: ChangeEvent<EventTarget>) {
    const value = (ev.target as HTMLInputElement).value

    this.setState({
      password: value
    })
  }

  handleChangePasswordConfirmation (ev: ChangeEvent<EventTarget>) {
    const value = (ev.target as HTMLInputElement).value

    this.setState({
      passwordConfirmation: value
    })
  }

  isAndroid () {
    return navigator.userAgent.match(/android/i)
  }

  render () {
    return (
      <OnboardingContainer totalSteps={0} currentStep={0}>
        {this.renderContent()}
      </OnboardingContainer>
    )
  }

  renderContent (): ReactNode {
    if (this.state.showingPassword) {
      return this.renderPassword()
    }

    return this.renderSeedPhrase()
  }

  onBackupFieldPaste = (event: any, inputIdx: number) => {
    // from: https://stackoverflow.com/a/30496488
    var clipboardData = event.clipboardData || event.originalEvent.clipboardData || (window as any).clipboardData
    var pastedData = clipboardData.getData('text')
    let bits = pastedData.split(/\s+/)
    bits.forEach((bit: string, bitIdx: number) => {
      let idx = inputIdx + bitIdx
      let input = this.backupFieldInputRefs[idx]
      if (!input)
        return
      let value = bit.replace(/[^a-z]/gi, '')
      input.value = value
      this.setSeedWordForIndex(idx, value)
    })
    event.preventDefault()
    return false
  }

  renderPassword (): ReactNode {
    return (
      <div className={style.content}>
        <div className={style.funnelTitle}>
          Restore Backup Seed
        </div>
        <TextBox className={style.passwordTextBox}>
          Enter a new password to encrypt your wallet.
        </TextBox>
        <div className={style.restorePasswordWrapper}>
          <Input
            placeholder="New Password"
            type="password"
            className={style.passwordInput}
            onChange={this.handleChangePassword}
            errorMessage={this.state.passwordError}
            inverse
          />
          <Input
            placeholder="Confirm Password"
            type="password"
            className={style.passwordInput}
            onChange={this.handleChangePasswordConfirmation}
            errorMessage={this.state.passwordConfirmationError}
            inverse
          />
        </div>
        <div className={`${style.funnelFooter} ${this.isAndroid() ? style.androidFooter : ''}`}>
          <Button
            type="secondary"
            content="Go Back"
            onClick={this.props.goBack}
            isInverse
          />
          <Button
            content="Next"
            onClick={this.handleSubmitPassword}
            isInverse
          />
        </div>
      </div>
    )
  }

  renderSeedPhrase (): ReactNode {
    return (
      <div className={style.content}>
        <div className={style.funnelTitle}>
          Restore Backup Seed
        </div>
        <TextBox className={style.passwordTextBox}>
          {this.state.seedError ? this.state.seedError : 'Enter your SpankCard backup words. Use tab to jump to the next field.'}
        </TextBox>
        {this.renderFields()}
        <div className={`${style.funnelFooter} ${this.isAndroid() ? style.androidFooter : ''}`}>
          <Button
            type="secondary"
            content="Go Back"
            onClick={this.props.goBack}
            isInverse
          />
          <Button
            content={<div className={style.restoreButton} />}
            onClick={this.handleSubmitSeed}
            isInverse
          />
        </div>
      </div>
    )
  }

  renderFields () {
    const out = []

    for (let i = 0; i < 12; i++) {
      out.push(
        <li key={i} className={style.backupFieldWrapper}>
          <Input
            autoFocus={i === 0}
            className={style.backupField}
            inputRef={(ref: any) => this.backupFieldInputRefs[i] = ref}
            onPaste={(event: any) => this.onBackupFieldPaste(event, i)}
            {...this.setSeed(i)}
            inverse
          />
        </li>
      )
    }

    return (
      <ol className={style.backupFields}>
        {out}
      </ol>
    )
  }
}

function mapStateToProps (state: FrameState): RestorePageStateProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default connect<RestorePageStateProps, undefined, any>(mapStateToProps)(RestorePage)
