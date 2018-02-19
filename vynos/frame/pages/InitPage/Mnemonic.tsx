import * as React from "react";
import {connect} from "react-redux";
import {Dispatch} from 'redux'
import {MouseEvent} from "react";
import {FrameState} from "../../redux/FrameState";
import WorkerProxy from "../../WorkerProxy";
import * as actions from "../../redux/actions";
// import { Container, Button, Form, Header, Divider } from 'semantic-ui-react'
import Button from "../../components/Button/index"
import TextBox from "../../components/TextBox/index"
import Input from "../../components/Input/index"
import WalletCard from "../../components/WalletCard/index"
import Logo from '../../components/Logo'
const style = require('../../styles/ynos.css')

export interface MnemonicStateProps {
  workerProxy: WorkerProxy
  mnemonic: string|null
}

export interface MnemonicDispatchProps {
  saveMnemonic: (workerProxy: WorkerProxy) => void
}


export type MnemonicSubpageProps = MnemonicStateProps & MnemonicDispatchProps

export class Mnemonic extends React.Component<MnemonicSubpageProps, {}> {
  handleSubmit () {
    this.props.saveMnemonic(this.props.workerProxy)
  }

  render () {
    const mnemonic = this.props.mnemonic || ''

    return (
      <div className={style.fullContainer}>
        <div className={style.header}>
          <div className={style.progressDots}>O O O O O O O</div>
          <div className={style.hamburger} />
        </div>
        <div className={style.content}>
          <WalletCard
            width={275}
            cardTitle="SpankCard"
            companyName="SpankChain"
            name="spanktoshi"
            className={style.funnelWalletCard}
          />
          <div className={style.funnelTitle}>Backup Codes</div>
          <div className={style.seedPhraseText}>
            These are your backup words to be able to restore your SpankWallet. Keep them somewhere safe and secret.
          </div>
          <div className={style.seedWords}>
            {mnemonic.split(' ').map((seed, i) => (
              <div className={style.seedWord}>
                <span className={style.seedWordIndex}>{i + 1}</span>
                {seed}
              </div>
            ))}
          </div>
          <div className={style.mnemonicFooter}>
            <Button
              type="secondary"
              content="Back"
              isInverse
            />
            <Button
              content="Next"
              onClick={this.handleSubmit.bind(this)}
              isInverse
            />
          </div>
        </div>
      </div>
    )
  }

  handleSaveToFile () {
    let mnemonic = this.props.mnemonic
    let blob = new Blob([mnemonic], {type: 'text/plain'})
    let filename = 'secretSeedPhrase.txt'
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      var elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  }
}

function mapStateToProps (state: FrameState): MnemonicStateProps {
  return {
    workerProxy: state.temp.workerProxy,
    mnemonic: state.temp.initPage.mnemonic,
  }
}

function mapDispatchToProps(dispatch: Dispatch<FrameState>): MnemonicDispatchProps {
  return {
    saveMnemonic: workerProxy => {
      workerProxy.didStoreMnemonic()
      dispatch(actions.didStoreMnemonic(''))
    }
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Mnemonic)
