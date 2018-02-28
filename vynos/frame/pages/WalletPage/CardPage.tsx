import * as React from 'react'
import CTAInput from '../../components/CTAInput/index'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import {BrandingState} from '../../../worker/WorkerState'

const s = require('./styles.css')

export interface StateProps extends BrandingState {
  walletBalance: string|null
}

const CardPage: React.SFC<StateProps> = (props) => {
  const { walletBalance } = props;

  return (
    <div className={s.walletSpankCardWrapper}>
      <div className={s.walletRow}>
        <div className={s.walletFundsHeader}>Wallet Funds</div>
        <div className={s.walletRowBalanceWrapper}>
          <CTAInput
            isInverse
            isConnected
            value={`$${walletBalance || ' - '}`}
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
            cardTitle={props.title}
            companyName={props.companyName}
            name={props.username}
            backgroundColor={props.backgroundColor}
            color={props.textColor}
            currencyValue={walletBalance}
            className={s.walletSpankCard}
          />
        </div>
        <div className={s.walletSpankCardActions}>
          <Button type="secondary" content="Withdraw into Wallet" isMini />
          <Button to="/wallet/activity" type="secondary" content="Activity" isMini />
        </div>
      </div>
    </div>
  )
}

function mapStateToProps (state: FrameState, ownProps: any): StateProps {
  return {
    ...state.shared.branding,
    walletBalance: state.wallet.main.balance
  }
}

export default connect(mapStateToProps)(CardPage)
