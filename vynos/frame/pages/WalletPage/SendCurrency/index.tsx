import * as React from 'react'
import { ChangeEvent } from 'react'
import { connect } from 'react-redux'
import { FrameState } from '../../../redux/FrameState'
import { CurrencyType } from '../../../components/Currency/index'
import * as BigNumber from 'bignumber.js';
import WorkerProxy from '../../../WorkerProxy'
import { PendingTransaction } from '../../../../worker/WorkerState'
import { cardBalance } from '../../../redux/selectors/cardBalance'
import CurrencyConvertable from '../../../../lib/CurrencyConvertable'
import { AutoFillButtons } from './AutoFillButtons'
import { SendCurrencyFooter } from './SendCurrencyFooter'
import { SendCurrencyHeader } from './SendCurrencyHeader'
import { SendCurrencyInputs } from './SendCurrencyInputs'
import { setFeatureFlags } from '../../../../worker/actions';
import { FeatureFlags } from '../../../../worker/WorkerState'

const s = require('./index.css')
const si = require('./../styles.css')
const utils = require('web3-utils')

export interface MapStateToProps {
  workerProxy: WorkerProxy
  walletAddress: string | null
  cardBalance: CurrencyConvertable | null
  pendingTransaction: PendingTransaction | null
  currencyConvertable: (type: CurrencyType, amount: string | number | BigNumber.BigNumber) => CurrencyConvertable
  featureFlags: FeatureFlags
}

export interface MapDispatchToProps {
  // send
}

export interface OwnProps {
  history: any
}

export type SendCurrencyProps = MapStateToProps & MapDispatchToProps & OwnProps

export interface SendCurrencyState {
  addressError: string
  balanceError: string
  address: string
  balance: CurrencyConvertable | null,
  displayedBalances: [string, string],
  displayedBalanceTypes: [CurrencyType, CurrencyType],
  isAddressDirty: boolean
  disableSend: boolean
  isConfirming: boolean
  gasPrice: string
  gas: string
}

export class SendCurrency extends React.Component<SendCurrencyProps, SendCurrencyState> {
  state = {
    balance: null as CurrencyConvertable | null,
    displayedBalances: ['', ''] as [string, string],
    displayedBalanceTypes: [CurrencyType.FINNEY, CurrencyType.USD] as [CurrencyType, CurrencyType],
    balanceError: '',
    address: '',
    addressError: '',
    isAddressDirty: false,
    disableSend: false,
    isConfirming: false,
    gasPrice: '40',
    gas: '53000',
  }

  validateBalance = () => {
    const cardBalance = this.props.cardBalance!.amountBigNumber
    const {balance} = this.state
    if (!cardBalance) {
      return false
    }
    if (!balance) {
      this.setState({ balanceError: 'Balance cannot be empty' })
      return false
    }

    const numBalance = balance && balance.to(CurrencyType.WEI).amountBigNumber
    if (numBalance.eq(0)) {
      this.setState({
        balanceError: 'Balance cannot be 0'
      })
      return false
    }

    if (cardBalance.lessThan(numBalance)) {
      this.setState({
        balanceError: 'You do not have enough ether'
      })
      return false
    }
    return true
  }

  validateAddress = () => {
    const { walletAddress } = this.props
    const { address, isAddressDirty } = this.state
    const { isAddress } = utils

    if (!isAddressDirty) {
      return false
    }

    if (!address) {
      this.setState({
        addressError: 'Address cannot be empty'
      })
      return false
    }

    if (!isAddress(address)) {
      this.setState({
        addressError: 'Address is invalid'
      })
      return false
    }

    if (walletAddress === address) {
      this.setState({
        addressError: 'Address is the same as your own wallet address'
      })
      return false
    }

    return true
  }

  autoFill = (percentageMultiplier: number) => {
    const cardBalance = this.props.cardBalance

    const [type, amount] = cardBalance
      ? [cardBalance.type, cardBalance.amountBigNumber.mul(percentageMultiplier)]
      : [CurrencyType.WEI, 0]

    const balance = this.props.currencyConvertable(type, amount)

    this.setState({
      balance,
      balanceError: '',
      displayedBalances: [
        balance.to('FINNEY' as CurrencyType).format({ withSymbol: false }),
        balance.to('USD' as CurrencyType).format({ withSymbol: false })
      ]
    })
  }

  onBalanceChange = (inputIndex: 0 | 1) => (e: ChangeEvent<EventTarget>) => {
    const value = (e.target as HTMLInputElement).value

    if (value === '') {
      this.setState({
        balance: null,
        balanceError: '',
        displayedBalances: ['', ''],
      })
      return
    }

    const currencyType = this.state.displayedBalanceTypes[inputIndex]

    const balance = this.props.currencyConvertable(currencyType, value)!.to(this.props.cardBalance!.type)

    const displayedBalances = this.state.displayedBalances.map((b, i) => {
      return i === inputIndex
        ? value
        : balance.to(this.state.displayedBalanceTypes[i]).format({ withSymbol: false })
    }) as [string, string]

    this.setState({
      balance,
      balanceError: '',
      displayedBalances,
    })
  }

  onAddressChange = (e: ChangeEvent<EventTarget>) => {
    this.setState({
      address: (e.target as HTMLInputElement).value,
      addressError: '',
      isAddressDirty: true
    })
  }

  onSendTransaction = async () => {
    const { address, balance } = this.state

    this.setState({ disableSend: true })

    try {
      await this.props.workerProxy.send(
        address,
        balance!.toWEI().format({ decimals: 0, withSymbol: false }),
      )
    } catch (e) {
      console.error('failed to send ether', e)
      let balanceError = 'Failed to send Ether. Please try again.'

      this.setState({
        balanceError,
        disableSend: false,
        isConfirming: false
      })
      return
    }

    this.setState({
      balance: null,
      balanceError: '',
      address: '',
      addressError: '',
      isAddressDirty: false,
      disableSend: false
    }, () => this.props.history.push('/wallet/activity'))
  }

  confirm = () => {
    if (!this.validateAddress()) {
      this.setState({
        addressError: 'Please enter a valid Address.'
      })
      return
    }
    if (!this.validateBalance()) {
      this.setState({
        balanceError: 'Invalid balance. Please enter a valid balance.'
      })
      return
    }
    if (this.props.featureFlags.bootySupport) {
      // don't need to show the confirmation page if we're sending Booty
      // because it's withdrawing for the full amount, so just send the transaction
      this.onSendTransaction()
    } else {
      this.setState({ isConfirming: true })
    }
  }

  cancel = (): void => {
    this.setState({ isConfirming: false })
  }

  componentWillMount = () => {
    if (this.props.featureFlags.bootySupport) {
      this.autoFill(1)
    }
  }

  render() {
    const { addressError, balanceError, isConfirming, address, displayedBalances } = this.state
    let { featureFlags } = this.props
    return (
      <div className={s.container}>
        <div className={si.subpageWrapper}>
          <SendCurrencyHeader bootySupport={featureFlags.bootySupport}/>
          <SendCurrencyInputs
            address={address}
            addressError={addressError}
            balanceError={balanceError}
            isConfirming={isConfirming}
            displayedBalances={displayedBalances}
            onAddressChange={this.onAddressChange}
            onBalanceChange={this.onBalanceChange}
            bootySupport={featureFlags.bootySupport}
          />
          {!featureFlags.bootySupport && <AutoFillButtons
            autoFill={this.autoFill}
            isConfirming={isConfirming}
          />}
        </div>
        <SendCurrencyFooter
          isConfirming={isConfirming}
          addressError={addressError}
          balanceError={balanceError}
          cancel={this.cancel}
          confirm={this.confirm}
          disableSend={this.state.disableSend}
          onSendTransaction={this.onSendTransaction}
          walletAddress={this.props.walletAddress}
        />
      </div>
    )
  }
}


function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    workerProxy: state.temp.workerProxy,
    walletAddress: state.shared.address,
    cardBalance: new CurrencyConvertable(CurrencyType.WEI, cardBalance(state.shared).toString(10), () => state.shared.exchangeRates),
    currencyConvertable: (type: CurrencyType, amount: string | number | BigNumber.BigNumber) => new CurrencyConvertable(type, amount, () => state.shared.exchangeRates),
    pendingTransaction: state.shared.pendingTransaction,
    featureFlags: state.shared.featureFlags,
  }
}

export default connect(mapStateToProps)(SendCurrency)
