import * as React from 'react'
import Button from '../../components/Button/index'
import * as copy from 'copy-to-clipboard'

const s = require('./styles.css')

export interface Props {
  address: string|null
  balance: string|null
}


const SendReceivePage: React.SFC<Props> = (props) => {
  const {balance, address} = props
  const s = require('./styles.css')

  return (
    <div className={s.walletCard}>
      <div className={s.walletFunds}>
        <div className={s.walletFundsHeader}>Wallet Funds</div>
        <div className={s.walletBalance}>${balance || ' - '}</div>
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


export default SendReceivePage
