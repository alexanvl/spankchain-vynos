import * as React from 'react'
import CTAInput from '../../components/CTAInput/index'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import {BrandingState} from '../../../worker/WorkerState'
import {cardBalance} from '../../redux/selectors/cardBalance'
import * as BigNumber from 'bignumber.js';
import LoadUpSpank from './LoadUpSpank'
import WorkerProxy from '../../WorkerProxy'
import Currency, {CurrencyType} from '../../components/Currency/index'

const s = require('./styles.css')

export interface StateProps extends BrandingState {
  walletBalance: BigNumber.BigNumber
  cardBalance: BigNumber.BigNumber
  workerProxy: WorkerProxy
}

export interface CardPageState {
  isWithdrawing: boolean
}

class CardPage extends React.Component<StateProps, CardPageState> {
  constructor (props: StateProps) {
    super(props)

    this.state = {
      isWithdrawing: false
    }
  }

  async componentDidMount() {
    await this.props.workerProxy.populateChannels()
  }

  async onClickWithdraw () {
    this.setState({
      isWithdrawing: true
    })

    await this.props.workerProxy.closeChannelsForCurrentHub()

    this.setState({
      isWithdrawing: false
    })
  }

  render() {
    const { walletBalance, cardBalance } = this.props;

    return (
      <div className={s.walletSpankCardWrapper}>
        <div className={s.walletRow}>
          <div className={s.walletFundsHeader}>Wallet Funds</div>
          <div className={s.walletRowBalanceWrapper}>
            <CTAInput
              isInverse
              isConnected
              value={<Currency amount={walletBalance} inputType={CurrencyType.ETH} showUnit={true} />}
              ctaInputValueClass={s.spankCardCtaInputValue}
              ctaContentClass={s.spankCardCtaContent}
              ctaContent={() => (
                <div className={s.ctaContentWrapper} onClick={() => console.log('Filling')}>
                  <div className={s.ctaDivider} />
                  <span className={s.ctaText}>Refill SpankCard</span>
                </div>
              )}
            />
          </div>
          <div className={s.walletRowAction}>
            <Button to="/card/to/wallet" type="tertiary" content="More" />
          </div>
        </div>
        <div className={s.walletSpankCardDetails}>
          <div className={s.walletSpankCardView}>
            <WalletCard
              width={275}
              cardTitle={this.props.title}
              companyName={this.props.companyName}
              name={this.props.username}
              backgroundColor={this.props.backgroundColor}
              color={this.props.textColor}
              currencyValue={cardBalance}
              className={s.walletSpankCard}
            />
          </div>
          <div className={s.walletSpankCardActions}>
            <Button
              type="secondary"
              content={this.state.isWithdrawing ? 'Withdrawing...' : 'Withdraw to Wallet'}
              disabled={this.state.isWithdrawing}
              onClick={() => this.onClickWithdraw()}
              isMini
            />
            <Button to="/wallet/activity" type="secondary" content="Activity" isMini />
          </div>
        </div>
        {this.renderLoadUp()}
      </div>
    )
  }

  renderLoadUp () {
    if (this.props.cardBalance.gt(0)) {
      return null
    }

    return <LoadUpSpank />
  }
}

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    ...state.shared.branding,
    walletBalance: new BigNumber.BigNumber(state.wallet.main.balance || 0),
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(CardPage)
