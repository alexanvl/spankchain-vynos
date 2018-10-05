import * as React from 'react'
import { ReactNode } from 'react'
import { connect } from 'react-redux'
import WorkerProxy from '../../WorkerProxy'
import { FrameState } from '../../redux/FrameState'
import OnboardingContainer from './../InitPage/OnboardingContainer'
import SeedWords from './../RestorePage/SeedWords'
import NewPassword from './../RestorePage/NewPassword'
import RestorationCandidate from '../../../lib/RestorationCandidate'
import BigNumber from 'bignumber.js'
import PickAddress from './../RestorePage/PickAddress'
import bip39 = require('bip39')

export interface RestorePageStateProps {
  workerProxy: WorkerProxy
}

export enum RestorePageStep {
  SEED_WORDS,
  PICK_ADDRESS,
  NEW_PASSWORD
}

export interface RestorePageProps extends RestorePageStateProps {
  goBack: () => void
}

export interface RestorePageState {
  seeds: string[]
  showingPassword: boolean
  seedError: string
  passwordError: string
  step: RestorePageStep
  restorationCandidates: RestorationCandidate[]
  chosenRestorationCandidate: RestorationCandidate | null
}

const isAndroid = !!navigator.userAgent.match(/android/i)

class RestorePage extends React.Component<RestorePageProps, RestorePageState> {
  state = {
    seeds: [],
    showingPassword: false,
    seedError: '',
    passwordError: '',
    step: RestorePageStep.SEED_WORDS,
    restorationCandidates: [],
    chosenRestorationCandidate: null
  } as RestorePageState

  handleSubmitSeed = async (seeds: string[]) => {
    const mnemonic = seeds.join(' ')

    if (!bip39.validateMnemonic(mnemonic)) {
      this.setState({
        seedError: 'Invalid seed phrase. Did you forget or mistype a word?'
      })

      return
    }

    let restorationCandidates

    try {
      restorationCandidates = await this.props.workerProxy.generateRestorationCandidates(mnemonic)
    } catch (e) {
      return this.setState({
        seedError: 'Failed to generate private key. Please try again.'
      })
    }

    const candidatesWithBalance = restorationCandidates.filter((cand: RestorationCandidate) => new BigNumber(cand.balance).greaterThan(0))

    this.setState({
      seeds,
      restorationCandidates
    })

    // if there's only one address that has a balance, use that.
    if (candidatesWithBalance.length === 1) {
      return this.handlePickRestorationCandidate(candidatesWithBalance[0])
    }

    return this.setState({
      step: RestorePageStep.PICK_ADDRESS
    })
  }

  handlePickRestorationCandidate = (chosenRestorationCandidate: RestorationCandidate) => {
    this.setState({
      chosenRestorationCandidate,
      step: RestorePageStep.NEW_PASSWORD
    })
  }

  goto = (step: RestorePageStep) => {
    this.setState({step})
  }

  handleSubmitPassword = async (password: string) => {
    try {
      await this.props.workerProxy.restoreWallet(password, this.state.seeds.join(' '), this.state.chosenRestorationCandidate!.isHd)
    } catch (e) {
      this.setState({
        passwordError: e.message
      })

      return
    }

    this.props.goBack()
    await this.props.workerProxy.authenticate()
  }

  render() {
    return (
      <OnboardingContainer totalSteps={0} currentStep={0}>
        {this.renderContent()}
      </OnboardingContainer>
    )
  }

  renderContent = (): ReactNode => {
    switch (this.state.step) {
      case RestorePageStep.SEED_WORDS:
        return this.renderSeedWords()
      case RestorePageStep.PICK_ADDRESS:
        return this.renderPickAddress()
      case RestorePageStep.NEW_PASSWORD:
        return this.renderNewPassword()
      default:
        throw new Error('Invalid step.')
    }
  }

  renderSeedWords = (): ReactNode => {
    return (
      <SeedWords
        message={this.state.seedError}
        onSubmit={this.handleSubmitSeed}
        goBack={this.props.goBack}
        isAndroid={isAndroid}
      />
    )
  }

  renderPickAddress = (): ReactNode => (
    <PickAddress
      restorationCandidates={this.state.restorationCandidates}
      onSubmit={this.handlePickRestorationCandidate}
      goBack={() => this.goto(RestorePageStep.SEED_WORDS)} isAndroid={isAndroid}
    />
  )

  renderNewPassword = (): ReactNode => {
    const prev = this.state.restorationCandidates.length === 1 ? RestorePageStep.SEED_WORDS : RestorePageStep.PICK_ADDRESS

    return (
      <NewPassword
        message={this.state.passwordError}
        isAndroid={isAndroid}
        goBack={() => this.goto(prev)}
        onSubmit={this.handleSubmitPassword}
      />
    )
  }
}

function mapStateToProps(state: FrameState): RestorePageStateProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(RestorePage)
