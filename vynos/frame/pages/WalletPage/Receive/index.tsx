import * as React from 'react'
import {connect} from 'react-redux'
import ReceivePage from './Receive'

class Receive extends React.Component<{ address: string, bootySupport?: boolean, location: any, showRevealPrivateKey?: boolean }, any> {
  render () {
    let {address, bootySupport, showRevealPrivateKey} = this.props
    return (
      <ReceivePage address={address} bootySupport={bootySupport} showRevealPrivateKey={showRevealPrivateKey} />
    )
  }
}

function mapStateToProps (state: any): any {
  return {
    bootySupport: state.shared.featureFlags.bootySupport
  }
}

export default connect(mapStateToProps)(Receive)
