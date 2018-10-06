import * as React from "react"
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
import * as classnames from 'classnames'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { FrameState } from '../../../redux/FrameState'
import Input from "../../../components/Input"
import Button from "../../../components/Button"
import Currency from '../../../components/Currency'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { alertMessagesShort, getTransactionStep, getTotalTransactionSteps } from '../../../components/transactionStates'
import { CurrencyType, MigrationState } from "../../../../worker/WorkerState";
import IconCheckmark from '../../../components/IconCheckmark'

const s = require('./receive.css')
const baseStyle = require('../styles.css')

interface StateProps {
  migrationState?: MigrationState
}
export interface Props extends StateProps {
  address: string | null
  bootySupport?: boolean
  showRevealPrivateKey?: boolean
}

export interface State {
  isCopied: boolean
  displayState: boolean
}

function renderQR(address: string | null) {
  if (!address) {
    return null
  }

  let pngBuffer = qr.imageSync(address, { type: 'png', margin: 1 }) as Buffer
  let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')

  return (
    <img className={s.qrImage} src={dataURI} />
  )
}

export class Receive extends React.Component<Props, State> {
  timeout: any

  static defaultProps = {
    showRevealPrivateKey: true
  }

  state = {
    isCopied: false,
    displayState: true,
  }

  constructor(props: Props) {
    super(props)
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    // don't show the migration state if it failed (it's already shown on the spankcard)
    if (props.migrationState && props.migrationState == 'MIGRATION_FAILED') {
      return { displayState: false }
    }
    return {}
  }

  componentDidUpdate(prevProps: Props) {
    let currentMigrationState = this.props.migrationState
    let prevMigrationState = prevProps.migrationState
    if (currentMigrationState == 'DONE') {
      if (!prevMigrationState) {
        this.setState({displayState: false})
      } else {
        setTimeout(() => { this.setState({ displayState: false }) }, 5000)
      }
    }
  }

  onCopyAddress = () => {
    const { address } = this.props;

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

  render() {
    const {
      address,
      bootySupport
    } = this.props;

    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Receive Ether {bootySupport && 'to get Booty'}</div>
        <div className={classnames(baseStyle.label, s.mediumUp)}>
          {bootySupport ? <React.Fragment>
            Only send up to&nbsp;
            <Currency
              amount={69}
              outputType={CurrencyType.ETH}
              inputType={CurrencyType.USD}
            />&nbsp;Ether (ETH) to this address.
            </React.Fragment>
            : 'Only send Ether (ETH) to this address.'
          }
        </div>

        <div className={classnames(s.minAmount, s.smallDown)}>Min Amount

        </div>
        <Input
          disabled={true}
          value={address}
          className={s.input}
          onClick={this.onCopyAddress}
          disableError
        />
        <div className={s.bottomWrapper}>
          <div className={s.qrWrapper}>
            {renderQR(address)}
          </div>
          <div className={s.buttonWrapper}>
            { this.renderTransactionState() }
            <Button
              type='primary'
              onClick={this.onCopyAddress}
              isFullWidth
              content={<span className={s.buttonContent}>
                <div className={s.ctaIcon} />
                <span className={s.ctaText}>
                  {this.state.isCopied ? 'Copied' : 'Copy your address'}
                </span>
              </span>
              } />
            <Button
              type='secondary'
              to="https://help.spankchain.com/hc/en-us/articles/360004669831-Receiving-ETH"
              className={s.guideButton}
              content="Step-by-Step Guide"
              isFullWidth
            />
          </div>

        </div>
        {this.renderRevealPrivateKey()}
      </div>
    )
  }

  renderRevealPrivateKey () {
    if (!this.props.showRevealPrivateKey) {
      return null
    }

    return (
      <div className={s.recoverText}>
        <Link
          to="/wallet/reveal"
        >
          Reveal Private Key (Advanced)
        </Link>
      </div>
    )
  }

  renderTransactionState() {
    let { migrationState } = this.props
    let { displayState } = this.state
    if (!migrationState || !displayState) {
      return 
    }

    let currentStep = getTransactionStep(migrationState)
    let totalSteps = getTotalTransactionSteps()
    let end = currentStep == totalSteps
    let start = currentStep == 1 

    return (
      <div className={classnames(s.whiteRect, s.transactionState)}>
        <span className={s.stepsWrapper}>
          <span className={s.steps}>{ end ? <IconCheckmark/> : `${currentStep}/${totalSteps}`}</span>
          <LoadingSpinner inverted big noAnimate={start || end}/>
        </span>
        <span className={s.transactionStateMessage}>{alertMessagesShort[migrationState]}</span>
      </div>
    )
  }
}

function mapStateToProps(state:FrameState): StateProps {
  return {
    migrationState: state.shared.migrationState,
  }
}

export default connect(mapStateToProps)(Receive)
