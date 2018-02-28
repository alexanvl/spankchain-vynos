import * as React from 'react'
import WalletMenu, {nameByPath} from './WalletMenu'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import Web3 = require('web3')
import WorkerProxy from '../../WorkerProxy'
// import DashboardSubpage from "./DashboardSubpage";
// import Channels from "../../components/Account/Channels/index"
// import Network from "../../components/Account/Network/index"
// import Preferences from "../../components/Account/Preferences/index"
// import TransactionStorage from "../../../lib/storage/TransactionMetaStorage"
import Button from '../../components/Button/index'
import WalletCard from '../../components/WalletCard/index'
import ActivitySubpage from './ActivitySubpage'
import SendReceivePage from './SendReceivePage'
import SpankCardPage from './SpankCardPage'
import SendEther from './SendEther'
import ReceiveEther from './ReceiveEther'
import LoadUpSpank from './LoadUpSpank'

const s = require('./styles.css')

// Wallet main page type
const WALLET_MAIN_PAGE = {
  SEND_RECEIVE: 'send_receive',
  SPANK_CARD: 'spank_card',
}

// Wallet subpage types
const WALLET_SUB_PAGE = {
  ACTIVITY: 'activity',
  NO_BALANCE: 'no_balance',
  RECEIVE_ETHER: 'receive_ether',
  NONE: 'none',
  // LOAD_UP_SPANK logic
  // IF user click tip
  // AND there is no Spank balance
  // BUT there is wallet balance
  LOAD_UP_SPANK: 'load_up_spank',
  SEND_ETHER: 'send_ether',
  GO_BACK_TO_SPANK_CARD: 'go_back_to_spank_card',
}

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
  address: string|null
  walletBalance: string|null
}

export interface WalletPageState {
  currentWalletPage: string
  currentWalletSubpage: string
  spankBalance: string
  sendShown: boolean
}

function hasBalance(balance: string|null): boolean {
  if (!balance) {
    return false
  }

  if (!Number(balance)) {
    return false
  }

  return true
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {
  updateBalanceTimer: any;

  constructor (props: any) {
    super(props);
    this.state = {
      // TODO: backend integration to retrieve SpankCard balance
      spankBalance: '0',
      sendShown: false,
      currentWalletPage: WALLET_MAIN_PAGE.SEND_RECEIVE,
      currentWalletSubpage: WALLET_SUB_PAGE.NONE,
    };
  }

  getCurrentView() {
    const { walletBalance } = this.props
    const { spankBalance } = this.state

    if (!hasBalance(walletBalance) && !hasBalance(spankBalance)) {
      return {
        currentWalletPage: WALLET_MAIN_PAGE.SEND_RECEIVE,
        currentWalletSubpage: WALLET_SUB_PAGE.LOAD_UP_SPANK,
      }
    }

    if (hasBalance(spankBalance)) {
      return {
        currentWalletPage: WALLET_MAIN_PAGE.SPANK_CARD,
        currentWalletSubpage: WALLET_SUB_PAGE.NONE,
      }
    }

    return {
      currentWalletPage: WALLET_MAIN_PAGE.SEND_RECEIVE,
      currentWalletSubpage: WALLET_SUB_PAGE.NONE,
    }
  }

  componentWillMount() {
    const { currentWalletPage, currentWalletSubpage } = this.getCurrentView()
    this.setState({
      currentWalletPage,
      currentWalletSubpage,
    })
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

  renderMainPage() {
    const { currentWalletPage, spankBalance } = this.state
    const { walletBalance, address } = this.props

    switch (currentWalletPage) {
      case WALLET_MAIN_PAGE.SPANK_CARD:
        return (
          <SpankCardPage
            spankBalance={spankBalance}
            onGoToWalletView={() => this.setState({
              currentWalletPage: WALLET_MAIN_PAGE.SEND_RECEIVE,
              currentWalletSubpage: WALLET_SUB_PAGE.GO_BACK_TO_SPANK_CARD,
            })}
            onActivityClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.ACTIVITY })}
          />
        )
      case WALLET_MAIN_PAGE.SEND_RECEIVE:
        return (
          <SendReceivePage
            balance={walletBalance}
            address={address}
            onSendEtherClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.SEND_ETHER })}
            onReceiveEtherClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.RECEIVE_ETHER })}
          />
        )
      default:
        return null
    }
  }

  renderSubPage() {
    const { currentWalletSubpage } = this.state;
    const { address } = this.props

    switch (currentWalletSubpage) {
      case WALLET_SUB_PAGE.ACTIVITY:
        return <ActivitySubpage />
      case WALLET_SUB_PAGE.NO_BALANCE:
        return (
          <ReceiveEther
            headerText="Not enough funds in your Wallet"
            descriptionLineOne="If you want to tip them titties you have to send Ether to"
            descriptionLineTwo="your SpankWallet."
            linkText="See how to do this on Coinbase"
            address={address}
          />
        )
      case WALLET_SUB_PAGE.SEND_ETHER:
        return <SendEther />
      case WALLET_SUB_PAGE.RECEIVE_ETHER:
        return (
          <ReceiveEther
            headerText="Receive Ether / Deposit"
            descriptionLineOne="This is your Wallet address. You can copy it and"
            descriptionLineTwo="send crypto from places like Coinbase."
            linkText="See Tutorial"
            address={address}
          />
        )
      case WALLET_SUB_PAGE.LOAD_UP_SPANK:
        return <LoadUpSpank />
      case WALLET_SUB_PAGE.GO_BACK_TO_SPANK_CARD:
        return (
          <div className={s.goBackContainer}>
            <Button
              className={s.goBackButton}
              content="Back to SpankCard"
              onClick={() => this.setState({
                currentWalletPage: WALLET_MAIN_PAGE.SPANK_CARD,
                currentWalletSubpage: WALLET_SUB_PAGE.NONE,
              })}
            />
          </div>
        );
      case WALLET_SUB_PAGE.NONE:
      default:
        return null
    }
  }

  render () {
    return (
      <div className={s.walletWrapper}>
        {this.renderMainPage()}
        {this.renderSubPage()}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): WalletPageStateProps {
  let workerProxy = state.temp.workerProxy!
  return {
    name: nameByPath(state.shared.rememberPath),
    path: state.shared.rememberPath,
    web3: workerProxy.getWeb3(),
    workerProxy: workerProxy,
    address: state.wallet.main.address,
    walletBalance: state.wallet.main.balance,
  }
}

export default connect(mapStateToProps)(WalletPage)
