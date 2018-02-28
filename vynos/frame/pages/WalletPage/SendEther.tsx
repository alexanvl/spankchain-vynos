import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
const utils = require('web3-utils')
// import {Dispatch} from 'redux'
import {MouseEvent, ChangeEvent} from "react"
import * as classnames from 'classnames'
// import * as copy from 'copy-to-clipboard'
// import * as qr from 'qr-image'
// import postMessage from "../../lib/postMessage"
import {FrameState} from "../../redux/FrameState"
// import WorkerProxy from "../../WorkerProxy"
// import * as actions from "../../redux/actions"
import Input from "../../components/Input/index"
import Button from "../../components/Button/index"

const s = require('./SendEther.css')


export interface MapStateToProps {
  web3?: Web3
  walletAddress: string | null
  walletBalance: string | null
}

export interface MapDispatchToProps {
  
}

export type SendEtherProps = MapStateToProps & MapDispatchToProps

export interface SendEtherState {
  addressError: string
  balanceError: string
  address: string
  balance: string
  isAddressDirty: boolean
  isBalanceDirty: boolean
}

export class SendEther extends React.Component<SendEtherProps, SendEtherState> {
  constructor(props: SendEtherProps) {
    super(props)
    this.state = {
      balance: '',
      balanceError: '',
      isBalanceDirty: false,
      address: '',
      addressError: '',
      isAddressDirty: false,
    }
  }

  validateBalance = () => {
    const { walletBalance } = this.props
    const { balance, isBalanceDirty } = this.state

    if (!isBalanceDirty || !walletBalance) {
      return false
    }

    if (!balance) {
      this.setState({
        balanceError: 'Balance cannot be empty'
      })
      return false
    }

    if (!Number(balance)) {
      this.setState({
        balanceError: 'Balance cannot be 0'
      })
      return false
    }

    if (walletBalance < balance) {
      this.setState({
        balanceError: 'You do not have enough ether'
      })
      return false
    }

    return true
  }

  validateAddress = () => {
    const { walletAddress } = this.props
    const { address, isAddressDirty } = this.state
    const { isAddress } = utils

    if (!isAddressDirty) {
      return false
    }

    if (!address) {
      this.setState({
        addressError: 'Address cannot be empty'
      })
      return false
    }

    if (!isAddress(address)) {
      this.setState({
        addressError: 'Address is invalid'
      })
      return false
    }

    if (walletAddress === address) {
      this.setState({
        addressError: 'Address is the same as your own wallet address'
      })
      return false
    }

    return true
  }

  onBalanceChange = (e: ChangeEvent<EventTarget>) => {
    this.setState({
      balance: (e.target as HTMLInputElement).value,
      balanceError: '',
      isBalanceDirty: true,
    });
  }

  onAddressChange = (e: ChangeEvent<EventTarget>) => {
    this.setState({
      address: (e.target as HTMLInputElement).value,
      addressError: '',
      isAddressDirty: true,
    });
  }

  onSendTransaction = () => {
    const { web3, walletAddress } = this.props
    const { address, balance } = this.state

    if (!web3 || !walletAddress) {
      return
    }

    const isAddressValid = this.validateAddress()
    const isBalanceValid = this.validateBalance()

    if (!isAddressValid || !isBalanceValid) {
      return
    }

    const tx = {
      from: walletAddress,
      to: address,
      value: web3.toWei(balance, 'ether')
    }

    web3.eth.sendTransaction(tx, (err, transactionHash) => {
      if (err) {
        this.setState({
          balanceError: err.message,
        })
        return
      }

      console.log('Transaction hash :', transactionHash);
    })
  }

  render() {
    const { addressError, balanceError } = this.state

    return (
      <div className={s.container}>
        <div className={s.header}>Send Ether</div>
        <div className={s.contentRow}>
          <div className={s.inputWrapper}>
            <div className={s.inputLabel}>Address</div>
            <Input
              className={s.input}
              placeholder="0x3930DdDf234..."
              onChange={this.onAddressChange}
              onBlur={this.validateAddress}
              errorMessage={addressError}
            />
          </div>
        </div>
        <div className={s.contentRow}>
          <div className={s.inputWrapper}>
            <div className={s.inputLabel}>Ether Amount</div>
            <Input
              className={s.input}
              type="number"
              placeholder="0.00"
              onChange={this.onBalanceChange}
              onBlur={this.validateBalance}
              errorMessage={balanceError}
            />
          </div>
          <div className={s.inputResult}>
            <div className={s.inputEqual}>=</div>
            <div className={s.inputTotal}>$0</div>
          </div>
        </div>
        <div className={s.footer}>
          <Button
            type="secondary"
            className={s.adjustGasButton}
            content="Adjust Gas Limit/Price"
          />
          <Button content="Next" onClick={this.onSendTransaction}/>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    web3: state.temp.workerProxy.web3,
    walletAddress: state.wallet.main.address,
    walletBalance: state.wallet.main.balance,
  }
}

export default connect(mapStateToProps)(SendEther)
