import * as React from 'react'
import {connect} from 'react-redux'
import * as copy from 'copy-to-clipboard'
import * as BigNumber from 'bignumber.js';
import Button from '../../components/Button/index'
import {FrameState} from '../../redux/FrameState'
import Currency, {CurrencyType} from '../../components/Currency/index'

const s = require('./styles.css')

export interface MapStateToProps {
  address: string
  balance: BigNumber.BigNumber
}

const SendReceivePage: React.SFC<MapStateToProps> = (props) => {
  const {balance, address} = props
  const s = require('./styles.css')

  return (
    <div className={s.walletCard}>
      <div className={s.walletFunds}>
        <div className={s.walletFundsHeader}>Wallet Funds</div>
        <div className={s.walletBalance}>
          <Currency
            amount={balance}
            inputType={CurrencyType.ETH}
            showUnit
          />
        </div>
      </div>
      <div className={s.walletActions}>
        <Button
          type="secondary"
          content="Copy Address"
          onClick={() => address && copy(address)}
          isMini
        />
          <Button
          to="/wallet/receive"
            type="secondary"
            content="Receive Ether"
            isMini
          />
          <Button
          to="/wallet/send"
            type="secondary"
            content="Send Ether"
            isMini
          />
      </div>
    </div>
  )
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    address: state.wallet.main.address!,
    balance: new BigNumber.BigNumber(state.wallet.main.balance || 0),
  }
}

export default connect(mapStateToProps)(SendReceivePage)
