import * as React from "react";
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import CTAInput from '../../components/CTAInput/index'
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'

const s = require("./styles.css");

export interface MapStateToProps {
  walletBalance: string|null
}

export interface OwnProps {
  spankBalance: string
  onActivityClick: () => void
  onGoToWalletView: () => void
}

export interface Props extends MapStateToProps,OwnProps{}

const SpankCardPage: React.SFC<Props> = (props) => {
  const { spankBalance, onActivityClick, walletBalance, onGoToWalletView } = props;

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
                <div className={s.ctaDivider}/>
                <span className={s.ctaText}>Refill SpankCard</span>
              </div>
            )}
          />
        </div>
        <div className={s.walletRowAction}>
          <Button type="tertiary" content="More" onClick={onGoToWalletView} />
        </div>
      </div>
      <div className={s.walletSpankCardDetails}>
        <div className={s.walletSpankCardView}>
          <WalletCard
            width={275}
            cardTitle="SpankCard"
            companyName="SpankChain"
            name="spanktoshi"
            backgroundColor="#ff3b81"
            color="#fff"
            currencyValue={spankBalance}
            className={s.walletSpankCard}
          />
        </div>
        <div className={s.walletSpankCardActions}>
          <Button type="secondary" content="Withdraw into Wallet" isMini />
          <Button type="secondary" content="Activity" onClick={onActivityClick} isMini />
        </div>
      </div>
    </div>
  )
};

function mapStateToProps(state: FrameState, ownProps: OwnProps): MapStateToProps {
  return {
    walletBalance: state.wallet.main.balance,
  }
}

export default connect(mapStateToProps)(SpankCardPage);
