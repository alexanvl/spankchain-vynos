import * as React from 'react';
import ReceiveEther from './ReceiveEther'
import {Route, Switch} from 'react-router'
import SendEther from './SendEther'

export interface SendReceiveWrapperProps {
  balance: string
  address: string
}

export default class SendReceiveWrapper extends React.Component<SendReceiveWrapperProps, {}> {
  render() {
    if (this.props.balance === '0') {
      return (
        <ReceiveEther
          headerText="Not enough funds in your Wallet"
          descriptionLineOne="If you want to tip them titties you have to send Ether to"
          descriptionLineTwo="your SpankWallet."
          linkText="See how to do this on Coinbase"
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
              descriptionLineTwo="send crypto from places like Coinbase."
              linkText="See Tutorial"
              address={this.props.address}
            />
          )}
        />
      </Switch>
    )
  }
}