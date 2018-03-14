import * as React from 'react'
import {connect} from 'react-redux'
import * as copy from 'copy-to-clipboard'
import Button from '../../components/Button/index'
import {FrameState} from '../../redux/FrameState'
import Currency, {CurrencyType} from '../../components/Currency/index'

const s = require('./styles.css')

export interface MapStateToProps {
  address: string
  balance: string
  pendingAmount: string | null
}

class SendReceivePage extends React.Component<MapStateToProps>  {
  render() {
    const {balance, address} = this.props

    return (
      <div className={s.walletCard}>
        <div className={s.walletFunds}>
          <div className={s.walletFundsHeader}>Wallet Funds</div>
          <div className={s.walletBalance}>
            <Currency
              amount={balance}
              inputType={CurrencyType.WEI}
              showUnit
            />
            {this.renderPending()}
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

  renderPending () {
    if (!this.props.pendingAmount) {
      return null
    }

    return (
      <span className={s.pendingAmount}>
        -
        <Currency
          amount={this.props.pendingAmount}
          inputType={CurrencyType.WEI}
          showUnit
        />
      </span>
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    address: state.shared.address!,
    balance: state.shared.balance!,
    pendingAmount: state.shared.pendingTransaction ? state.shared.pendingTransaction.amount : null
  }
}

export default connect(mapStateToProps)(SendReceivePage)
