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
import CTAInput from '../../components/CTAInput/index'
import WalletCard from '../../components/WalletCard/index'
import * as qr from 'qr-image'
import * as copy from 'copy-to-clipboard'

const s = require('./styles.css')

export interface WalletPageStateProps {
  name: string
  path: string
  web3: Web3
  workerProxy: WorkerProxy
}

export interface WalletPageState {
  address: string
  balance: string
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
    };
  }

  componentDidMount () {
    if (this.props.web3) {
      let web3 = this.props.web3
      web3.eth.getAccounts((err, accounts) => {
        let address = accounts[0]
        this.updateBalanceTimer = setInterval(() => {
          web3.eth.getBalance(address, (err, balance) => {
            this.setState({
              balance: web3.fromWei(balance, 'ether').toString()
            })
          })
        }, 500)
        this.setState({
          address: address
        })
      })
    }
  }

  renderWalletView() {
    if (Number(this.state.spankBalance) > 0) {
      return (
        <div className={s.walletWrapper}>
          <div className={s.walletSpankCardWrapper}>
            <div className={s.walletRow}>
              <div className={s.walletFundsHeader}>Wallet Funds</div>
              <div className={s.walletRowBalanceWrapper}>
                <CTAInput
                  isInverse
                  isConnected
                  value={`$${this.state.spankBalance}`}
                  ctaContent={() => (
                    <div className={s.ctaContentWrapper} onClick={() => console.log('Filling')}>
                      <div className={s.ctaDivider}/>
                      <span className={s.ctaText}>Refill SpankCard</span>
                    </div>
                  )}
                />
              </div>
              <div className={s.walletRowAction}>
                <Button type="tertiary" content="More" />
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
                  currencyValue={this.state.spankBalance}
                  className={s.walletSpankCard}
                />
              </div>
              <div className={s.walletSpankCardActions}>
                <Button type="secondary" content="Withdraw into Wallet" isMini />
                <Button type="secondary" content="Activity" isMini />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={s.walletWrapper}>
        <div className={s.walletCard}>
          <div className={s.walletFunds}>
            <div className={s.walletFundsHeader}>Wallet Funds</div>
            <div className={s.walletBalance}>${this.state.balance}</div>
          </div>
          <div className={s.walletActions}>
            <Button type="secondary" content="Copy Address" isMini />
            <Button type="secondary" content="Receive Ether" isMini />
            <Button type="secondary" content="Send Ether" isMini />
          </div>
        </div>
        {this.renderWalletFundsDescription()}
      </div>
    );
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

  renderQR () {
    let pngBuffer = qr.imageSync(this.state.address, {type: 'png', margin: 1}) as Buffer
    let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')

    return (
      <img className={s.walletQR} src={dataURI} />
    )
  }

  renderWalletFundsDescription() {
    return Number(this.state.balance) === 0 && (
      <div className={s.walletDescriptionWrapper}>
        <div className={s.walletDescriptionHeader}>Not enough funds in your Wallet</div>
        <div className={s.walletDescription}>If you want to tip them titties you have to send Ether to your SpankWallet. See how to do this on Coinbase</div>
        <div className={s.walletAddressWrapper}>
          <CTAInput
            isInverse
            className={s.ctaInput}
            value={this.state.address}
            ctaContent={() => (
              <div className={s.ctaContentWrapper} onClick={() => copy(this.state.address)}>
                <div className={s.ctaIcon} />
                <span className={s.ctaText}>Copy</span>
              </div>
            )}
          />
        </div>
        <div className={s.walletQRWrapper}>
          <div className={s.walletQRHeader}>Only send Ether (ETH) to this address.</div>
          {this.renderQR()}
        </div>
      </div>
    )
  }

  render () {
    return this.renderWalletView()
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
