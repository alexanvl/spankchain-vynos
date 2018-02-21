import * as React from 'react'
import WalletMenu, {nameByPath} from './WalletMenu'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
// import DashboardSubpage from "./DashboardSubpage";
// import Channels from "../../components/Account/Channels/index"
// import Network from "../../components/Account/Network/index"
// import Preferences from "../../components/Account/Preferences/index"
// import TransactionStorage from "../../../lib/storage/TransactionMetaStorage"
import Button from "../../components/Button/index"

const s = require('./styles.css')

export interface WalletPageStateProps {
  path: string
  name: string
}

export interface WalletPageState {
  sendShown: boolean
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {

  constructor (props: any) {
    super(props);
    this.state = {sendShown: false};
  }

  // renderSubpage () {
  //   console.log('WalletPage.renderSubpage', this.props.name)
  //   switch (this.props.name) {
  //     case 'Channels':
  //       return <Channels />
  //     case 'Preferences':
  //       return <Preferences />
  //     case 'Network':
  //       return <Network />
  //     default:
  //       return <DashboardSubpage />
  //   }
  // }


  // consoleLogPendingTxs () {
  //   let storage = new TransactionStorage()
  //   storage.pending().then(allpending => {
  //     console.log(allpending)
  //   })
  // }

  render () {
    return (
      <div className={s.walletCard}>
        <div className={s.walletFunds}>
          <div className={s.walletFundsHeader}>Wallet Funds</div>
          <div className={s.walletBalance}>$0</div>
        </div>
        <div className={s.walletActions}>
          <Button type="secondary" content="Copy Address" isMini />
          <Button type="secondary" content="Receive Ether" isMini />
          <Button type="secondary" content="Send Ether" isMini />
        </div>
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): WalletPageStateProps {
  return {
    path: state.shared.rememberPath,
    name: nameByPath(state.shared.rememberPath)
  }
}

export default connect(mapStateToProps)(WalletPage)
