import * as React from "react";
import Button from '../../components/Button/index'

const s = require("./styles.css");

const SendReceivePage: React.SFC<any> = (props) => {
  const { balance } = props;

  return (
    <div className={s.walletCard}>
      <div className={s.walletFunds}>
        <div className={s.walletFundsHeader}>Wallet Funds</div>
        <div className={s.walletBalance}>${balance}</div>
      </div>
      <div className={s.walletActions}>
        <Button type="secondary" content="Copy Address" isMini />
        <Button type="secondary" content="Receive Ether" isMini />
        <Button type="secondary" content="Send Ether" isMini />
      </div>
    </div>
  )
};


export default SendReceivePage;
