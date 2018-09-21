import * as React from 'react'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import { FrameState } from '../../redux/FrameState'
import { connect } from 'react-redux'
import { BrandingState, ExchangeRates } from '../../../worker/WorkerState'
import { cardBalance } from '../../redux/selectors/cardBalance'
import WorkerProxy from '../../WorkerProxy'
import Currency, { CurrencyType } from '../../components/Currency/index'
import entireBalance from '../../lib/entireBalance'
import BN = require('bn.js')
import Tooltip from '../../components/Tooltip'
import { BalanceTooltip } from '../../components/BalanceTooltip'

const pageStyle = require('../UnlockPage.css')
const s = require('./styles.css')

export interface StateProps extends BrandingState {
  walletBalance: BN
  cardBalance: BN
  isWithdrawing: boolean
  workerProxy: WorkerProxy
  activeWithdrawalError: string | null
  isPendingVerification: boolean | undefined
  hasActiveDeposit: boolean
  exchangeRates: ExchangeRates | null
  isFrameDisplayed: boolean
}

enum ActiveButton {
  'NONE',
  'RECIEVE',
  'SEND',
  'ACTIVITY',
}

let activeButton: ActiveButton = ActiveButton.NONE

export interface SpankCardState {
  error: string
}

class SpankCard extends React.Component<StateProps, SpankCardState> {
  constructor(props: StateProps) {
    super(props)
    this.state = { error: '' }
  }

  onClickRefill = async () => {
    const amount = await entireBalance(this.props.workerProxy, this.props.walletBalance!)

    try {
      await this.props.workerProxy.deposit(amount)
    } catch (e) {
      this.setState({
        error: e.code === -32603
          ? 'Insufficient funds. Please deposit more ETH.'
          : 'Failed to load up SpankCard. Please try again.'
      })
      return
    }
  }

  setActiveButton = (_activeButton: ActiveButton) => {
    activeButton = _activeButton
    this.forceUpdate()
  }

  render() {
    const {
      cardBalance,
      exchangeRates,
      walletBalance,
      companyName,
      backgroundColor,
      isPendingVerification,
      title,
      textColor,
      hasActiveDeposit,
      isWithdrawing,
      isFrameDisplayed,
    } = this.props

    const reserveBalance = walletBalance
    if (!isFrameDisplayed) {
      activeButton = ActiveButton.NONE
    }

    return (
      <div className={s.walletSpankCardWrapper}>
        <div className={pageStyle.close} onClick={this.closeView} />
        {
          isPendingVerification
            ? <div className={s.walletRow}>Account will recieve 20 Finney once age verification is complete</div>
            : null
        }
        <div className={s.walletSpankCardContent}>
          {this.renderError()}
          <div className={s.walletSpankCardDetails}>
            <div className={s.walletSpankCardView}>
              <WalletCard
                width={275}
                cardTitle={title}
                companyName={companyName}
                backgroundColor={backgroundColor}
                color={textColor}
                currencyValue={cardBalance}
                className={s.walletSpankCard}
                isLoading={hasActiveDeposit || isWithdrawing}
                gradient
              />
            </div>
            <div className={s.walletSpankCardActions}>
              <Tooltip
                trigger="click"
                className="balanceTooltip" // this is intentionally a string because tooltip styles need to be added to /components/Tooltip/unprefixedStyle.css
                content={
                  <BalanceTooltip
                    amount={cardBalance}
                    inputType={CurrencyType.WEI}
                    reserveBalance={reserveBalance}
                    reserveBalanceType={CurrencyType.WEI}
                    exchangeRates={exchangeRates}
                    hasActiveDeposit={hasActiveDeposit}
                  />
                }
              >
                <div className={s.usdBalance}>
                  <Currency
                    amount={cardBalance}
                    inputType={CurrencyType.WEI}
                    outputType={CurrencyType.USD}
                    className={s.sendReceiveCurrency}
                    unitClassName={s.usdUnit}
                    showUnit={true}
                    big
                  />
                  <div className={s.downArrow} />
                </div>
              </Tooltip>
              <div className={s.buttonSpacer} />
              <Button
                to="/wallet/receive"
                type={activeButton === ActiveButton.RECIEVE ? "primary" : "secondary"}
                onClick={() => this.setActiveButton(ActiveButton.RECIEVE)}
                content="Receive"
                isMini
              />
              <Button
                to="/wallet/send"
                type={activeButton === ActiveButton.SEND ? "primary" : "secondary"}
                onClick={() => this.setActiveButton(ActiveButton.SEND)}
                content="Send"
                isMini
              />
              <Button
                to="/wallet/activity"
                type={activeButton === ActiveButton.ACTIVITY ? "primary" : "secondary"}
                onClick={() => this.setActiveButton(ActiveButton.ACTIVITY)}
                content="Activity"
                isMini
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderError = () => {
    const { activeWithdrawalError } = this.props

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

  closeView = () => {
    this.props.workerProxy.toggleFrame(false)
  }
}

function mapStateToProps(state: FrameState): StateProps {
  return {
    ...state.shared.branding,
    walletBalance: new BN(state.shared.balance),
    cardBalance: cardBalance(state.shared),
    isWithdrawing: state.shared.hasActiveWithdrawal,
    activeWithdrawalError: state.shared.activeWithdrawalError,
    workerProxy: state.temp.workerProxy,
    isPendingVerification: state.shared.isPendingVerification,
    hasActiveDeposit: state.shared.hasActiveDeposit,
    exchangeRates: state.shared.exchangeRates,
    isFrameDisplayed: state.shared.isFrameDisplayed,
  }
}

export default connect(mapStateToProps)(SpankCard)