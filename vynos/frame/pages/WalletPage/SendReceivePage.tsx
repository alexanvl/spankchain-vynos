import * as React from "react";
import Button from '../../components/Button/index'
import * as copy from 'copy-to-clipboard'

const s = require("./styles.css");

export interface Props {
  onSendEtherClick: () => void
  onReceiveEtherClick: () => void
  address: string
  balance: string
}


const SendReceivePage: React.SFC<Props> = (props) => {
  const { balance, onSendEtherClick, onReceiveEtherClick, address } = props;

  return (
    <div className={s.walletCard}>
      <div className={s.walletFunds}>
        <div className={s.walletFundsHeader}>Wallet Funds</div>
        <div className={s.walletBalance}>${balance}</div>
      </div>
      <div className={s.walletActions}>
        <Button
          type="secondary"
          content="Copy Address"
          onClick={() => copy(address)}
          isMini
        />
        <Button
          type="secondary"
          content="Receive Ether"
          onClick={onReceiveEtherClick}
          isMini
        />
        <Button
          type="secondary"
          content="Send Ether"
          onClick={onSendEtherClick}
          isMini
        />
      </div>
    </div>
  )
};


export default SendReceivePage;
