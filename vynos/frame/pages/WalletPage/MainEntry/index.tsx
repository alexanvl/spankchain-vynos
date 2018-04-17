import * as React from 'react'
import {connect} from 'react-redux'
import SendReceivePage from '../SendReceivePage'
import SpankCardPage from '../CardPage'
import {FrameState} from '../../../redux/FrameState'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import WorkerProxy from '../../../WorkerProxy'
import * as BigNumber from 'bignumber.js'

export interface MapStateToProps {
  address: string
  cardBalance: BigNumber.BigNumber
  workerProxy: WorkerProxy
}

export type Props = MapStateToProps

export class MainEntry extends React.Component<Props> {
  render() {
    const { cardBalance, address } = this.props

    if (!address) {
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
    address: state.shared.address!,
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy,
  }
}

export default connect(
  mapStateToProps
)(MainEntry)
