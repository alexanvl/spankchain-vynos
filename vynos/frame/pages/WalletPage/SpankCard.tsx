import * as React from 'react'
import { RouteComponentProps, withRouter } from 'react-router'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import { FrameState } from '../../redux/FrameState'
import { connect } from 'react-redux'
import { BrandingState, ExchangeRates, FeatureFlags } from '../../../worker/WorkerState'
import { cardBalance } from '../../redux/selectors/cardBalance'
import WorkerProxy from '../../WorkerProxy'
import Currency, { CurrencyType } from '../../components/Currency/index'
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
  baseCurrency: CurrencyType
}

export interface UnlockPageProps extends StateProps, RouteComponentProps<any> {
}

export interface SpankCardState {
  error: string
}

class SpankCard extends React.Component<UnlockPageProps, SpankCardState> {
  state = {error: ''} as SpankCardState


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
      location,
      baseCurrency,
    } = this.props


    const reserveBalance = walletBalance

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
                currencyType={baseCurrency}
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
                    currencyType={baseCurrency}
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
                    showUnit
                    showPlainTextUnit
                    big
                  />
                  <div className={s.downArrow} />
                </div>
              </Tooltip>
              <div className={s.buttonSpacer} />
              <Button
                to="/wallet/receive"
                type={(location && location.pathname) === "/wallet/receive" ? "primary" : "secondary"}
                content="Receive"
                isMini
              />
              <Button
                to="/wallet/send"
                type={(location && location.pathname) === "/wallet/send" ? "primary" : "secondary"}
                content="Send"
                isMini
              />
              <Button
                to="/wallet/activity"
                type={(location && location.pathname) === "/wallet/activity" ? "primary" : "secondary"}
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
  const walletBalance = state.shared.addressBalances
  return {
    ...state.shared.branding,
    walletBalance: new BN(walletBalance.ethBalance.amount),
    cardBalance: cardBalance(state.shared),
    isWithdrawing: state.shared.hasActiveWithdrawal,
    activeWithdrawalError: state.shared.activeWithdrawalError,
    workerProxy: state.temp.workerProxy,
    isPendingVerification: state.shared.isPendingVerification,
    hasActiveDeposit: state.shared.hasActiveDeposit,
    exchangeRates: state.shared.exchangeRates,
    isFrameDisplayed: state.shared.isFrameDisplayed,
    baseCurrency: state.shared.baseCurrency,
  }
}

export default withRouter(connect(mapStateToProps)(SpankCard))
