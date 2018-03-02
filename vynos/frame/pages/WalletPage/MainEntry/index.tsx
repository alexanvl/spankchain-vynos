import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
import {Dispatch} from 'redux'
import {MouseEvent} from "react"
import * as classnames from 'classnames'
import SendReceivePage from '../SendReceivePage'
import SpankCardPage from '../CardPage'
import {FrameState} from '../../../redux/FrameState'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import WorkerProxy from '../../../WorkerProxy'
import * as BigNumber from 'bignumber.js'

const s = require('./index.css')

export interface MapStateToProps {
  address: string
  walletBalance: BigNumber.BigNumber
  cardBalance: BigNumber.BigNumber
  workerProxy: WorkerProxy
}

export type Props = MapStateToProps

export interface State {
  isInitializingBalances: boolean
}

export class MainEntry extends React.Component<Props, State> {
  state = {
    isInitializingBalances: true,
  }

  async componentDidMount() {
    await this.props.workerProxy.populateChannels()
    this.setState({ isInitializingBalances: false })
  }

  render() {
    const { walletBalance, cardBalance, address } = this.props
    const { isInitializingBalances } = this.state

    if (!address || isInitializingBalances) {
      return <noscript />
    }

    if (cardBalance.gt(0)) {
      return <SpankCardPage />
    }

    return (
      <SendReceivePage />
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    address: state.wallet.main.address!,
    walletBalance: new BigNumber.BigNumber(state.wallet.main.balance || 0),
    // cardBalance: new BigNumber.BigNumber(0),
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy,
  }
}

export default connect(
  mapStateToProps
)(MainEntry)
