import * as React from "react";
import {connect} from "react-redux";
import {FormEvent} from "react";
import {Dispatch} from 'redux'
import {FrameState} from "../../redux/FrameState";
import * as actions from "../../redux/actions"
import WorkerProxy from "../../WorkerProxy";
import { Container, Button, Form, Header, Divider } from 'semantic-ui-react'
import Logo from '../../components/Logo'
const style = require('../../styles/ynos.css')

export interface MnemonicStateProps {
  workerProxy: WorkerProxy
  mnemonic: string|null
}

export interface MnemonicDispatchProps {
  didStoreMnemonic: () => void
}

export type MnemonicPageProps = MnemonicStateProps & MnemonicDispatchProps

export class Mnemonic extends React.Component<MnemonicPageProps, {}> {
  handleSubmit (ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    this.props.workerProxy.didStoreMnemonic()
    this.props.didStoreMnemonic()
  }

  render () {
    return <Container textAlign="center" className={`${style.flexContainer} ${style.clearBorder}`}>
      <Logo />
      <Divider hidden />
      <Header as='h1' className={style.mnemonicHeader}>
        Remember these words
        <Header.Subheader>
          Save them somewhere safe and secret. <br />
          These restore the wallet.
        </Header.Subheader>
      </Header>
      <Form onSubmit={this.handleSubmit.bind(this)} className={style.mnemonicForm}>
        <Form.Field control='textarea' rows='3' value={this.props.mnemonic} readOnly className={style.mnemonicTextarea} />
        <Divider hidden />
        <Button type='submit' content="Done" primary className={style.buttonNav} />
        <p>
          <a onClick={this.handleSaveToFile.bind(this)}>Save words to file</a>
        </p>
      </Form>
    </Container>
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
    mnemonic: state.temp.initPage.mnemonic,
    workerProxy: state.temp.workerProxy
  }
}

function mapDispatchToProps(dispatch: Dispatch<FrameState>): MnemonicDispatchProps {
  return {
    didStoreMnemonic: () => dispatch(actions.didStoreMnemonic(''))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Mnemonic)
