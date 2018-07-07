import * as React from 'react'
import { BigNumber } from 'bignumber.js';
import CTAInput from '../../components/CTAInput/index'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import {BrandingState} from '../../../worker/WorkerState'
import {cardBalance} from '../../redux/selectors/cardBalance'
import WorkerProxy from '../../WorkerProxy'
import {CLOSE_CHANNEL_ERRORS} from '../../../lib/ChannelClaimStatusResponse'
import Currency, {CurrencyType} from '../../components/Currency/index'
import entireBalance from '../../lib/entireBalance'
import CurrencyIcon from '../../components/CurrencyIcon/index'
import RefillButton from '../../components/RefillButton/index'
import {TEN_FINNEY} from '../../../lib/constants'

const s = require('./styles.css')

export interface StateProps extends BrandingState {
  walletBalance: BigNumber
  cardBalance: BigNumber
  isWithdrawing: boolean
  workerProxy: WorkerProxy
  activeWithdrawalError: string|null
}

export interface CardPageState {
  isRefilling: boolean
  error: string
  showFinUsdConversionRate: boolean
}

class CardPage extends React.Component<StateProps, CardPageState> {
  constructor (props: StateProps) {
    super(props)

    this.state = {
      isRefilling: false,
      error: '',
      showFinUsdConversionRate: false
    }

    this.toggleShowFinConversionRate = this.toggleShowFinConversionRate.bind(this)
    this.onClickRefill = this.onClickRefill.bind(this)
  }

  async componentDidMount() {
    await this.props.workerProxy.populateChannels()
  }

  async onClickWithdraw () {
    try {
      await this.props.workerProxy.closeChannelsForCurrentHub()
    } catch (e) {
      if (e.message === CLOSE_CHANNEL_ERRORS.ALREADY_IN_PROGRESS) {
        return this.setState({ error: e.message })
      }

      this.setState({
        error: 'Withdrawal failed. Please try again.',
      })
    }
  }

  async onClickRefill () {
    this.setState({
      isRefilling: true
    })

    const amount = await entireBalance(this.props.workerProxy, new BigNumber(this.props.walletBalance!))

    try {
      await this.props.workerProxy.deposit(amount)
    } catch (e) {
      this.setState({
        isRefilling: false,
        error: e.code === -32603
          ? 'Insufficient funds. Please deposit more ETH.'
          : 'Failed to load up SpankCard. Please try again.'
      })
      return
    }

    this.setState({
      isRefilling: false
    })
  }

  toggleShowFinConversionRate (showFinUsdConversionRate: boolean) {
    this.setState({
      showFinUsdConversionRate
    })
  }

  render() {
    const { walletBalance, cardBalance } = this.props;
    const isTooLow = walletBalance.lt(TEN_FINNEY)

    return (
      <div className={s.walletSpankCardWrapper}>
        <div className={s.walletRow}>
          <div className={s.walletFundsHeader}>Wallet Funds</div>
          <div className={s.walletRowBalanceWrapper}>
            <CTAInput
              isInverse
              isConnected
              value={(
                <Currency
                  amount={walletBalance}
                  inputType={CurrencyType.WEI}
                  outputType={CurrencyType.FINNEY}
                  className={s.sendReceiveCurrency}
                  unitClassName={s.finneyUnit}
                  showUnit={true}
                />
              )}
              className={s.spankCardCta}
              ctaInputValueClass={s.spankCardCtaInputValue}
              ctaContentClass={s.spankCardCtaContent}
              isDisabled={this.state.isRefilling || isTooLow}
              ctaContent={() =>
                <RefillButton
                  isRefilling={this.state.isRefilling}
                  isTooLow={isTooLow}
                  onClick={this.onClickRefill}
                />
              }
            />
          </div>
          <div className={s.walletRowAction}>
            <Button to="/card/to/wallet" type="tertiary" content="More" />
          </div>
        </div>
        <div className={s.walletSpankCardContent}>
          {this.renderError()}
          <div className={s.walletSpankCardDetails}>
            <div className={s.walletSpankCardView}>
              <WalletCard
                width={275}
                cardTitle={this.props.title}
                companyName={this.props.companyName}
                backgroundColor={this.props.backgroundColor}
                color={this.props.textColor}
                currencyValue={cardBalance}
                className={s.walletSpankCard}
                onToggleUsdFinney={this.toggleShowFinConversionRate}
              />
            </div>
            <div className={s.walletSpankCardActions}>
              <Button
                type="secondary"
                content={this.props.isWithdrawing ? 'Withdrawing...' : 'Withdraw to Wallet'}
                disabled={this.props.isWithdrawing}
                onClick={() => this.onClickWithdraw()}
                isMini
              />
              <Button to="/wallet/activity" type="secondary" content="Activity" isMini />
              {this.renderFinUsdConversionRate()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderError () {
    const {activeWithdrawalError} = this.props

    if (!this.state.error && !activeWithdrawalError) {
      return null
    }

    return (
      <div className={s.walletSpankCardError}>
        {
          this.state.error
            ? this.state.error
            : activeWithdrawalError
        }
      </div>
    )
  }

  renderFinUsdConversionRate () {
    if (!this.state.showFinUsdConversionRate) {
      return
    }

    const fin = new BigNumber(this.props.workerProxy.web3.toWei(1, 'finney'))

    return (
      <div className={s.walletSpankCardConversionRate}>
        <div className={s.walletSpankCardConversionRateFinTag}>
          <CurrencyIcon alt /> 1
        </div>
        =
        <Currency
        amount={fin}
        inputType={CurrencyType.WEI}
        outputType={CurrencyType.USD}
        className={s.walletSpankCardConversionRateAmount}
        showUnit
      />
      </div>
    )
  }
}

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    ...state.shared.branding,
    walletBalance: new BigNumber(state.shared.balance),
    cardBalance: cardBalance(state.shared),
    isWithdrawing: state.shared.hasActiveWithdrawal,
    activeWithdrawalError: state.shared.activeWithdrawalError,
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(CardPage)
