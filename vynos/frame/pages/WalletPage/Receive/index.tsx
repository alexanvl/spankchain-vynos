import * as React from 'react'
import { connect } from 'react-redux'
import { Route, Switch } from 'react-router'
import ReceivePage from './Receive'
import LandingPage from './Landing'

class Receive extends React.Component<{ address: string, bootySupport?: boolean, location: any }, any> {
  render() {
    let { address, bootySupport } = this.props
    return (
      // Keeping this in because we may want the landing page within the next few weeks
      //
      // bootySupport ? 
      // <Switch>
      //   <Route
      //     exact
      //     path="/wallet/receive"
      //     render={() => <LandingPage /> }
      //   />
      //   <Route
      //     path="/wallet/receive/start"
      //     render={() => <ReceivePage address={address} bootySupport/>}
      //   />
      // </Switch>
      // :
      <ReceivePage address={address} bootySupport={bootySupport}/>
    )
  }
}

function mapStateToProps(state: any): any {
  return {
    bootySupport: state.shared.featureFlags.bootySupport,
  }
}
export default connect(mapStateToProps)(Receive)