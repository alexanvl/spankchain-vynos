import * as React from 'react';
import ReceiveEther from './ReceiveEther'
import {Route, Switch} from 'react-router'
import SendEther from './SendEther'
import * as BigNumber from 'bignumber.js';

export interface SendReceiveWrapperProps {
  balance: BigNumber.BigNumber
  address: string
}

export default class SendReceiveWrapper extends React.Component<SendReceiveWrapperProps, {}> {
  render() {
    if (!this.props.balance.gt(0)) {
      return (
        <ReceiveEther
          headerText="Not enough funds in your Wallet"
          descriptionLineOne="If you want to tip, you'll need to send ETH to your wallet."
          descriptionLineTwo="Send from any ETH wallet under your control, or from an exchange."
          linkText=""
          address={this.props.address}
        />
      )
    }

    return (
      <Switch>
        <Route
          exact
          path="/wallet/send"
          component={SendEther}
        />
        <Route
          exact
          path="/wallet/receive"
          render={() => (
            <ReceiveEther
              headerText="Receive Ether / Deposit"
              descriptionLineOne="This is your Wallet address. You can copy it and"
              descriptionLineTwo="send crypto from any exchange."
              linkText="See Tutorial"
              address={this.props.address}
            />
          )}
        />
      </Switch>
    )
  }
}
