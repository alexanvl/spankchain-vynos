import * as React from 'react'
import {connect} from 'react-redux'
import {Dispatch} from 'redux'
import {FrameState} from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import * as actions from '../../redux/actions'
import Button from '../../components/Button/index'
import Checkbox from '../../components/Checkbox/index'
import WalletCard from '../../components/WalletCard/index'
import {withRouter} from 'react-router'

const style = require('../../styles/ynos.css')

export interface MnemonicStateProps {
  workerProxy: WorkerProxy
  mnemonic: string | null
}

export interface MnemonicDispatchProps {
  saveMnemonic: (workerProxy: WorkerProxy) => void
}

export interface MnemonicStates {
  acknowledged: boolean
  isAuthenticating: boolean
}


export type MnemonicSubpageProps = MnemonicStateProps & MnemonicDispatchProps

export class Mnemonic extends React.Component<MnemonicSubpageProps, MnemonicStates> {
  constructor (props: MnemonicSubpageProps) {
    super(props)
    this.state = {
      acknowledged: false,
      isAuthenticating: false
    }
  }

  async handleSubmit () {
    if (this.state.acknowledged) {
      this.props.saveMnemonic(this.props.workerProxy)
    }
  }

  render () {
    const mnemonic = this.props.mnemonic || ''

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
          <div className={style.funnelTitle}>Backup Codes</div>
          <div className={style.seedPhraseText}>
            These are your backup words to be able to restore your SpankWallet. Keep them somewhere safe and secret.
          </div>
          <div className={style.seedWords}>
            {mnemonic.split(' ').map((seed, i) => (
              <div className={style.seedWord} key={seed}>
                <span className={style.seedWordIndex}>{i + 1}</span>
                {seed}
              </div>
            ))}
          </div>
          <div className={style.ackMnemonics}>
            <Checkbox
              className={style.ackCheckbox}
              onChange={(e: any) => this.setState({acknowledged: e.target.checked})}
            />
            <div className={style.ackText}>I've copied the backup words somewhere safe and secret.</div>
          </div>
          <div className={style.mnemonicFooter}>
            <Button
              type="secondary"
              content="Back"
              isInverse
            />
            <Button
              content={this.state.isAuthenticating ? 'Authenticating...' : 'Next'}
              onClick={this.handleSubmit.bind(this)}
              isInverse
              disabled={!this.state.acknowledged && !this.state.isAuthenticating}
            />
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): MnemonicStateProps {
  return {
    workerProxy: state.temp.workerProxy,
    mnemonic: state.temp.initPage.mnemonic
  }
}

function mapDispatchToProps (dispatch: Dispatch<FrameState>): MnemonicDispatchProps {
  return {
    saveMnemonic: workerProxy => {
      workerProxy.didStoreMnemonic()
      dispatch(actions.didStoreMnemonic(''))
    }
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Mnemonic))
