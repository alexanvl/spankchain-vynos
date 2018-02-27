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
import NoBalanceSubpage from './NoBalanceSubpage'
import SendReceivePage from './SendReceivePage'
import SpankCardPage from './SpankCardPage'
import SendEther from './SendEther'

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
  NONE: 'none',
  SEND_ETHER: 'send_ether',
}

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
}

export interface WalletPageState {
  address: string
  balance: string
  currentWalletPage: string
  currentWalletSubpage: string
  spankBalance: string
  sendShown: boolean
}

export class WalletPage extends React.Component<WalletPageStateProps, WalletPageState> {
  updateBalanceTimer: any;

  constructor (props: any) {
    super(props);
    this.state = {
      address: '',
      balance: '0',
      // TODO: backend integration to retrieve SpankCard balance
      spankBalance: '23',
      sendShown: false,
      currentWalletPage: SPANK_CARD,
      currentWalletSubpage: ACTIVITY,
    };
  }

  componentDidMount () {
    if (this.props.web3) {
      let web3 = this.props.web3
      web3.eth.getAccounts((err, accounts) => {
        let address = accounts[0]
        this.updateBalanceTimer = setInterval(() => {
          web3.eth.getBalance(address, (err, balance) => {
            let currentWalletPage, currentWalletSubpage;
            const currentBalance = web3.fromWei(balance, 'ether').toString()

            // if (Number(balance) === 0 && Number(this.state.spankBalance) === 0) {
            //   currentWalletPage = SEND_RECEIVE
            //   currentWalletSubpage = NO_BALANCE
            // } else {
            //   currentWalletPage = SPANK_CARD
            //   currentWalletSubpage = NONE
            // }

            // this.setState({
            //   balance: currentBalance,
            //   currentWalletPage,
            //   currentWalletSubpage,
            // })
          })
        }, 500)
        this.setState({
          address: address
        })
      })
    }
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
    const { balance, currentWalletPage, spankBalance, address } = this.state;

    switch (currentWalletPage) {
      case WALLET_MAIN_PAGE.SPANK_CARD:
        return (
          <SpankCardPage
            spankBalance={spankBalance}
            onActivityClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.ACTIVITY })}
          />
        )
      case WALLET_MAIN_PAGE.SEND_RECEIVE:
        return (
          <SendReceivePage
            balance={balance}
            address={address}
            onSendEtherClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.SEND_ETHER })}
            onReceiveEtherClick={() => this.setState({ currentWalletSubpage: WALLET_SUB_PAGE.NO_BALANCE })}
          />
        )
      default:
        return null
    }
  }

  renderSubPage() {
    const { address, currentWalletSubpage } = this.state;

    switch (currentWalletSubpage) {
      case WALLET_SUB_PAGE.ACTIVITY:
        return <ActivitySubpage />
      case WALLET_SUB_PAGE.NO_BALANCE:
        return <NoBalanceSubpage address={address} />
      case WALLET_SUB_PAGE.SEND_ETHER:
        return <SendEther />
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
  }
}

export default connect(mapStateToProps)(WalletPage)
