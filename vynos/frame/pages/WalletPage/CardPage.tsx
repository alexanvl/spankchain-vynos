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

class CardPage extends React.Component<StateProps, any> {
  async componentDidMount() {
    await this.props.workerProxy.populateChannels()
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
              ctaContent={() => (
                <div className={s.ctaContentWrapper} onClick={() => console.log('Filling')}>
                  <div className={s.ctaDivider} />
                  <span className={s.ctaText}>Refill SpankCard</span>
                </div>
              )}
            />
          </div>
          <div className={s.walletRowAction}>
            <Button to="/wallet/send" type="tertiary" content="More" />
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
            <Button type="secondary" content="Withdraw into Wallet" isMini />
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
