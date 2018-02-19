import * as React from "react";
import {connect} from "react-redux";
import {FrameState} from "../../redux/FrameState";
import Password from './Password'
import Mnemonic from './Mnemonic'

export interface InitPageProps {
  mnemonic: string|null
}

const InitPage: React.SFC<InitPageProps> = (props) => {
  if (props.mnemonic) {
    return <Mnemonic mnemonic={props.mnemonic} />
  }

  return <Password />
}

function mapStateToProps(state: FrameState): InitPageProps {
  return {
    mnemonic: state.temp.initPage.mnemonic
  }
}

export default connect<InitPageProps, undefined, any>(mapStateToProps)(InitPage)
