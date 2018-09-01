import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { FrameState } from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import * as actions from '../../redux/actions'
import Button from '../../components/Button/index'
import Checkbox from '../../components/Checkbox/index'
import OnboardingContainer from './OnboardingContainer'
import { RouteComponentProps, RouteProps, RouterProps, withRouter } from 'react-router'

const style = require('../../styles/ynos.css')

export interface MnemonicStateProps {
  workerProxy: WorkerProxy
  mnemonic: string | null
  isPerformer?: boolean
}

export interface MnemonicDispatchProps {
  saveMnemonic: (workerProxy: WorkerProxy) => void
  didAcknowledgeDeposit: () => void
}

export interface MnemonicStates {
  acknowledged: boolean
  isAuthenticating: boolean
}


export type MnemonicSubpageProps = MnemonicStateProps & MnemonicDispatchProps & RouteComponentProps<any>

export class Mnemonic extends React.Component<MnemonicSubpageProps, MnemonicStates> {
  constructor(props: MnemonicSubpageProps) {
    super(props)
    this.state = {
      acknowledged: false,
      isAuthenticating: false
    }
  }

  async handleSubmit() {
    if (this.state.acknowledged) {
      this.props.saveMnemonic(this.props.workerProxy)

      if (this.props.isPerformer) {
        this.props.didAcknowledgeDeposit()
        this.setState({
          isAuthenticating: true
        })

        await this.props.workerProxy.authenticate()
      }
    }
  }

  render() {
    const { isPerformer } = this.props
    const mnemonic = this.props.mnemonic || ''

    return (
      <OnboardingContainer
        headerText={isPerformer ? 'Become a Model' : ''}
        totalSteps={isPerformer ? 3 : 4}
        currentStep={1}
      >
        <div className={style.content}>
          <div className={style.funnelTitle} data-sel="signupPasswordHeader">Backup Words</div>
          <div className={style.seedPhraseText}>
            <p>Ever hear of backup words? They're not as scary as they look - but they are <em>very important</em>.</p>
            <p>Save these words in a safe place. If you forget your password, your backup words are the <em>only</em> way to get your SpankCard back.</p>
          </div>
          <div className={style.seedWords}>
            {mnemonic.split(' ').map((seed, i) => (
              <div className={style.seedWord} key={`${seed}-${i}`}>
                <span className={style.seedWordIndex}>{i + 1}</span>
                {seed}
              </div>
            ))}
          </div>
          <div className={style.seedPhraseText}>
            <p>Keep them secret. Keep them safe. DO NOT LOSE OR SHARE! SPANKCHAIN CANNOT RESTORE THEM FOR YOU!</p>
            <p>Welcome to Crypto! 😘</p>
          </div>
          <label>
            <div className={style.ackMnemonics}>
              <Checkbox
                className={style.ackCheckbox}
                onChange={(e: any) => this.setState({ acknowledged: e.target.checked })}
                name="signupAckCheckbox"
              />
              <div className={style.ackText}>I have copied the backup words. They are secret. They are safe. I promise!</div>
            </div>
          </label>
          <div className={style.mnemonicFooter}>
            <Button
              content={this.state.isAuthenticating ? 'Authenticating...' : 'Next'}
              onClick={this.handleSubmit.bind(this)}
              isInverse
              disabled={!this.state.acknowledged && !this.state.isAuthenticating}
              name="signupAckWordsButton"
            />
          </div>
        </div>
      </OnboardingContainer>
    )
  }
}

function mapStateToProps(state: FrameState): MnemonicStateProps {
  return {
    workerProxy: state.temp.workerProxy,
    mnemonic: state.temp.initPage.mnemonic,
    isPerformer: state.shared.isPerformer,
  }
}

function mapDispatchToProps(dispatch: Dispatch): MnemonicDispatchProps {
  return {
    saveMnemonic: workerProxy => {
      workerProxy.didStoreMnemonic()
      dispatch(actions.didStoreMnemonic(''))
    },
    didAcknowledgeDeposit: () => {
      dispatch(actions.didAcknowledgeDeposit(''))
    }
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Mnemonic))
