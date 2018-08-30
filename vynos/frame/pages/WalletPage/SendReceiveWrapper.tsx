import * as React from 'react';
import ReceiveEther from './ReceiveEther'
import ReceiveEtherStart from './ReceiveEtherStart'
import { Route, Switch } from 'react-router'
import SendCurrency from './SendCurrency'
import BN = require('bn.js')

export interface SendReceiveWrapperProps {
  balance: BN
  address: string
}

export default class SendReceiveWrapper extends React.Component<SendReceiveWrapperProps, {}> {
  render() {

    return (
      <Switch>
        <Route
          exact
          path="/wallet/send"
          component={SendCurrency}
        />
        <Route
          exact
          path="/wallet/receive"
          render={() => (
            <ReceiveEther />
          )}
        />
        <Route
          exact
          path="/wallet/receive/start"
          render={() => (
            <ReceiveEtherStart
              address={this.props.address}
            />
          )}
        />
      </Switch>
    )
  }
}
