import * as React from 'react'
import {connect} from 'react-redux'
import SpankCardPage from '../CardPage'
import {FrameState} from '../../../redux/FrameState'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import WorkerProxy from '../../../WorkerProxy'
import {Route, Switch} from 'react-router'
import BN = require('bn.js')

export interface MapStateToProps {
  address: string
  cardBalance: BN
  workerProxy: WorkerProxy
}

export type Props = MapStateToProps

export class MainEntry extends React.Component<Props> {
  render () {
    return (
      <Switch>
        <Route
          path="/wallet"
          render={({location: {pathname}}) => this.renderWallet(pathname)}
        />
      </Switch>
    )
  }

  renderWallet (pathname: string) {
    const {address} = this.props

    if (!address) {
      return <noscript />
    }

    return <SpankCardPage/>
  }
}

function mapStateToProps (state: FrameState): MapStateToProps {
  return {
    address: state.shared.address!,
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy
  }
}

export default connect(
  mapStateToProps
)(MainEntry)
