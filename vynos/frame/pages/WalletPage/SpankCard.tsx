import * as React from 'react'
import {RouteComponentProps, withRouter} from 'react-router'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import {Balances, BrandingState, CurrencyType, ExchangeRates} from '../../../worker/WorkerState'
import WorkerProxy from '../../WorkerProxy'
import Currency from '../../components/Currency/index'
import Tooltip from '../../components/Tooltip'
import CurrencyConvertable from '../../../lib/currency/CurrencyConvertable'
import {ICurrency} from '../../../lib/currency/Currency'
import {BalanceTooltip} from '../../components/BalanceTooltip'
import BN = require('bn.js')

const pageStyle = require('../UnlockPage.css')
const s = require('./styles.css')


export interface StateProps extends BrandingState {
  reserveBalance: ICurrency
  isWithdrawing: boolean
  workerProxy: WorkerProxy
  activeWithdrawalError: string | null
  isPendingVerification: boolean | undefined
  hasActiveDeposit: boolean
  exchangeRates: ExchangeRates
  isFrameDisplayed: boolean
  baseCurrency: CurrencyType
  cardBalances: Balances
  bootySupport: boolean
}

export interface UnlockPageProps extends StateProps, RouteComponentProps<any> {
}

export interface SpankCardState {
  error: string
}

class SpankCard extends React.Component<UnlockPageProps, SpankCardState> {
  state = {error: ''} as SpankCardState


  render () {
    const {
      reserveBalance,
      companyName,
      backgroundColor,
      isPendingVerification,
      title,
      textColor,
      hasActiveDeposit,
      isWithdrawing,
      location,
      baseCurrency,
      cardBalances,
      bootySupport,
      exchangeRates
    } = this.props

    const amtBei = cardBalances.tokenBalance.amount
    const amtWei = cardBalances.ethBalance.amount
    const cardConv = new CurrencyConvertable(
      bootySupport ? CurrencyType.BEI : CurrencyType.WEI,
      bootySupport ? amtBei : amtWei,
      () => exchangeRates
    )
    const cardAmt = bootySupport ? cardConv.toBOOTY() : cardConv.toFIN()
    const bootyUSD = new CurrencyConvertable(CurrencyType.BEI, amtBei, () => exchangeRates).toUSD()
    const weiUSD = new CurrencyConvertable(CurrencyType.WEI, amtWei, () => exchangeRates).toUSD()
    const reserveUSD = new CurrencyConvertable(CurrencyType.WEI, reserveBalance.amount, () => exchangeRates).toUSD()
    const total = bootyUSD.amountBN
      .add(weiUSD.amountBN)
      .add(reserveUSD.amountBN)

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
                currencyValue={cardAmt.amountBN}
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
                    amount={total}
                    inputType={CurrencyType.WEI}
                    reserveBalance={new BN(reserveBalance.amount)}
                    exchangeRates={exchangeRates}
                    hasActiveDeposit={hasActiveDeposit}
                    currencyType={CurrencyType.WEI}
                    cardBalances={cardBalances}
                  />
                }
              >
                <div className={s.usdBalance}>
                  <Currency
                    amount={total}
                    inputType={CurrencyType.USD}
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
                type={(location && location.pathname) === '/wallet/receive' ? 'primary' : 'secondary'}
                content="Receive"
                isMini
              />
              <Button
                to="/wallet/send"
                type={(location && location.pathname) === '/wallet/send' ? 'primary' : 'secondary'}
                content="Send"
                isMini
              />
              <Button
                to="/wallet/activity"
                type={(location && location.pathname) === '/wallet/activity' ? 'primary' : 'secondary'}
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

  closeView = () => {
    this.props.workerProxy.toggleFrame(false)
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    ...state.shared.branding,
    isWithdrawing: state.shared.hasActiveWithdrawal,
    activeWithdrawalError: state.shared.activeWithdrawalError,
    workerProxy: state.temp.workerProxy,
    isPendingVerification: state.shared.isPendingVerification,
    hasActiveDeposit: state.shared.hasActiveDeposit,
    exchangeRates: state.shared.exchangeRates!,
    isFrameDisplayed: state.shared.isFrameDisplayed,
    baseCurrency: state.shared.baseCurrency,
    cardBalances: state.shared.channel.balances,
    bootySupport: state.shared.featureFlags.bootySupport!,
    reserveBalance: state.shared.addressBalances.ethBalance
  }
}

export default withRouter(connect(mapStateToProps)(SpankCard))
