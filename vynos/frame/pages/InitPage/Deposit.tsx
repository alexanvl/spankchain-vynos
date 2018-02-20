import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
import {Dispatch} from 'redux'
import {MouseEvent} from "react"
import * as classnames from 'classnames'
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
import {FrameState} from "../../redux/FrameState"
import WorkerProxy from "../../WorkerProxy"
import * as actions from "../../redux/actions"
import Button from "../../components/Button/index"
import TextBox from "../../components/TextBox/index"
import Input from "../../components/Input/index"
import WalletCard from "../../components/WalletCard/index"
import CTAInput from "../../components/CTAInput/index"
const style = require('../../styles/ynos.css')

export interface DepositStateProps {
  web3?: Web3
}

export interface DepositStates {
  address: string
}

export type DepositProps = DepositStateProps & DepositDispatchProps

export interface DepositDispatchProps {
  didAcknowledgeDeposit: () => void
}

export class Deposit extends React.Component<DepositProps, DepositStates> {
  constructor(props: DepositProps) {
    super(props)
    this.state = {
      address: '',
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

  renderQR () {
    let pngBuffer = qr.imageSync(this.state.address, {type: 'png', margin: 1}) as Buffer
    let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')
    return <img className={classnames('react-qr', style.qrCode)} src={dataURI} />
  }

  render () {
    return (
      <div className={style.fullContainer}>
        <div className={style.header}>
          <div className={style.progressDots}>O O O O O O O</div>
          <div className={style.hamburger} />
        </div>
        <div className={style.content}>
          <WalletCard
            width={275}
            cardTitle="SpankCard"
            companyName="SpankChain"
            name="spanktoshi"
            className={style.funnelWalletCard}
          />
          <div className={style.funnelTitle}>Transfer Funds</div>
          <div className={style.seedPhraseText}>
            This is your SpankWallet address. You can copy it and send crypto from places like Coinbase.
          </div>
          <CTAInput
            className={style.ctaInput}
            value={this.state.address}
            ctaContent={() => (
              <div className={style.ctaContentWrapper} onClick={() => copy(this.state.address)}>
                <div className={style.ctaIcon} />
                <span className={style.ctaText}>Copy</span>
              </div>
            )}
          />
          <div className={style.mnemonicWarning}>
            Only send Ether (ETH) to this address.
          </div>
          <div className={style.mnemonicFooter}>
            <Button
              type="secondary"
              content="Back"
              isInverse
            />
            <Button
              content="Next"
              isInverse
              onClick={this.props.didAcknowledgeDeposit}
            />
          </div>
        </div>
        {this.renderQR()}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): DepositStateProps {
  return {
    web3: state.temp.workerProxy.web3,
  }
}

function mapDispatchToProps(dispatch: Dispatch<FrameState>): DepositDispatchProps {
  return {
    didAcknowledgeDeposit: () => {
      dispatch(actions.didAcknowledgeDeposit(''))
      const url = window.location != window.parent.location
        ? document.referrer
        : document.location.href

      window.parent.postMessage({
        type: 'vynos/parent/hideFull'
      }, getDomain(url))

      function getDomain(url: string) {
        const a = document.createElement('a')
        a.setAttribute('href', url)
        return (a as any).origin
      }
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Deposit)
