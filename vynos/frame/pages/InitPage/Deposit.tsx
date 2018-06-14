import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
import {Dispatch} from 'redux'
import * as classnames from 'classnames'
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
import {FrameState} from "../../redux/FrameState"
import WorkerProxy from "../../WorkerProxy"
import * as actions from "../../redux/actions"
import Button from "../../components/Button/index"
import CTAInput from "../../components/CTAInput/index"
import OnboardingContainer from './OnboardingContainer'

const style = require('../../styles/ynos.css')
const d = require('./Deposit.css')

export interface DepositStateProps {
  web3?: Web3
  workerProxy: WorkerProxy
}

export interface DepositStates {
  address: string
  isAuthenticating: boolean
  isCopied: boolean
}

export type DepositProps = DepositStateProps & DepositDispatchProps

export interface DepositDispatchProps {
  didAcknowledgeDeposit: () => void
}

export class Deposit extends React.Component<DepositProps, DepositStates> {
  timeout: any

  state = {
    address: '',
    isAuthenticating: false,
    isCopied: false,
  }

  handleSubmit = async () => {
    this.setState({
      isAuthenticating: true
    })

    try {
      await this.props.workerProxy.authenticate()

      this.props.workerProxy.toggleFrame(false)

      setTimeout(async () => {
        await this.props.didAcknowledgeDeposit()
      }, 500)
    } catch (e) {
      this.setState({
        isAuthenticating: false
      })
    }
  }

  componentDidMount() {
    const { web3 } = this.props
    if (web3) {
      web3.eth.getAccounts((err: any, accounts: any) => {
        let address = accounts[0]
        this.setState({ address })
      })
    }
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  onCopyAddress = () => {
    const { address } = this.state;

    if (address) {
      copy(address)
      this.setState({
        isCopied: true,
      })

      this.timeout = setTimeout(() => {
        this.setState({ isCopied: false })
      }, 2000)
    }
  }

  renderQR () {
    let pngBuffer = qr.imageSync(this.state.address, {type: 'png', margin: 1}) as Buffer
    let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')
    return <img className={classnames('react-qr', style.qrCode)} src={dataURI} />
  }

  render () {
    return (
      <OnboardingContainer totalSteps={4} currentStep={2}>
        <div className={style.content}>
          <div className={style.funnelTitle} data-sel="signupDepositHeader">Wallet Address</div>
          <div className={style.seedPhraseText}>
          This is your Wallet address, also known as a Public Key. Copy it. Give to others. Send ETH from an exchange or other wallet you control to this address. You'll then be able load your SpankCard and tip away!
          </div>
          <CTAInput
            className={style.ctaInput}
            ctaInputValueClass={d.ctaInputValue}
            ctaContentClass={d.ctaInputContent}
            value={this.state.address}
            name="signupWalletAddress"
            ctaContent={() => (
              <div data-sel="signupCopyAddress" className={style.ctaContentWrapper} onClick={this.onCopyAddress}>
                <div className={style.ctaIcon} />
                <span className={style.ctaText} data-sel="signupCopyText">
                  {this.state.isCopied ? 'Copied' : 'Copy'}
                </span>
              </div>
            )}
          />
          <div className={style.mnemonicWarning}>
            Only send Ether (ETH) to this address.
          </div>
          <div className={style.mnemonicFooter}>
            <Button
              content={this.state.isAuthenticating ? 'Loading' : 'Next'}
              isInverse
              disabled={this.state.isAuthenticating}
              onClick={this.handleSubmit}
              name="signupCompleteButton"
            />
          </div>
        </div>
        {this.renderQR()}
      </OnboardingContainer>
    )
  }
}

function mapStateToProps(state: FrameState): DepositStateProps {
  return {
    web3: state.temp.workerProxy.web3,
    workerProxy: state.temp.workerProxy,
  }
}

function mapDispatchToProps(dispatch: Dispatch<FrameState>): DepositDispatchProps {
  return {
    didAcknowledgeDeposit: () => dispatch(actions.didAcknowledgeDeposit(''))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Deposit)
