import * as React from 'react'
import { Route, Switch } from 'react-router'
import {connect} from 'react-redux'
import ReceivePage from './Receive'
import Landing from './Landing'

class Receive extends React.Component<{ address: string, bootySupport?: boolean, location: any, showRevealPrivateKey?: boolean }, any> {
  render () {
    let {address, bootySupport, showRevealPrivateKey} = this.props
    return (
      <Switch>
        <Route
          exact
          path="/wallet"
          render={() => <Landing />}
        />
        <Route
          exact
          path="/wallet/receive"
          render={() => <Landing />}
        />
        <Route
          exact
          path="/wallet/receive/start"
          render={() => <ReceivePage address={address} bootySupport={bootySupport} showRevealPrivateKey={showRevealPrivateKey} />}
        />
        </Switch>
      
    )
  }
}

function mapStateToProps (state: any): any {
  return {
    bootySupport: state.shared.featureFlags.bootySupport
  }
}

export default connect(mapStateToProps)(Receive)
