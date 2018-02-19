import * as React from "react";
import {connect} from "react-redux";
import {FrameState} from "../../redux/FrameState";
import Password from './Password'
import Mnemonic from './Mnemonic'

export interface InitPageProps {
  mnemonic: string|null
  showInitialDeposit: boolean
}

const InitPage: React.SFC<InitPageProps> = (props) => {
  if (props.mnemonic) {
    return <Mnemonic />
  }

  if (props.showInitialDeposit) {
    return <div>Make Deposit man</div>
  }

  return <Password />
}

function mapStateToProps(state: FrameState): InitPageProps {
  return {
    mnemonic: state.temp.initPage.mnemonic,
    showInitialDeposit: state.temp.initPage.showInitialDeposit,
  }
}

export default connect<InitPageProps, undefined, any>(mapStateToProps)(InitPage)
