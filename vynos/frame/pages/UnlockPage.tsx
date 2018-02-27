import * as React from 'react'
import {connect} from 'react-redux'
import {ChangeEvent, FormEvent} from 'react'
import _ = require('lodash')
import WorkerProxy from '../WorkerProxy';
import postMessage from "../lib/postMessage"
import Logo from '../components/Logo'
import {FrameState} from "../redux/FrameState";
import RestorePage from "./RestorePage";
import Button from "../components/Button/index"
import TextBox from "../components/TextBox/index"
import Input from "../components/Input/index"
import WalletCard from "../components/WalletCard/index"
import WalletMiniCard from "../components/WalletMiniCard/index"

const style = require("../styles/ynos.css");

export interface UnlockPageProps {
  workerProxy: WorkerProxy
}

export type UnlockPageState = {
  password: string
  passwordError: string|null
  loading: boolean
  displayRestore: boolean
};

export class UnlockPage extends React.Component<UnlockPageProps, UnlockPageState> {
  constructor (props: UnlockPageProps) {
    super(props);
    this.state = {
      password: '',
      passwordError: null,
      loading: false,
      displayRestore: false
    };
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.doDisplayRestore = this.doDisplayRestore.bind(this);
  }

  handleChangePassword (event: ChangeEvent<HTMLInputElement>) {
    let value = event.target.value
    this.setState({
      password: value,
      passwordError: null
    })
  }

  handleSubmit (ev: FormEvent<HTMLFormElement>) {
    this.setState({ loading: true });
    let password = _.toString(this.state.password);
    this.props.workerProxy
      .doUnlock(password)
      .then((passwordError) => {
        if (passwordError) {
          this.setState({ passwordError })
        } else {
          postMessage(window, {
            type: 'vynos/parent/loginComplete',
          })
        }
      })
  }

  renderPasswordInput () {
    let className = this.state.passwordError ? style.inputError : ''
    return (
      <input
        type="password"
        placeholder="Password"
        className={className}
        onChange={this.handleChangePassword.bind(this)}
      />
    )
  }

  doDisplayRestore () {
    this.setState({
      displayRestore: true
    })
  }

  doneDisplayRestorePage () {
    this.setState({
      displayRestore: false
    })
  }

  componentWillMount() {
    this.props.workerProxy.doLock.call(this.props.workerProxy)
  }

  // render () {
  //   if (this.state.displayRestore)
  //     return <RestorePage goBack={this.doneDisplayRestorePage.bind(this)} />

  //   return <Container textAlign="center" className={`${style.flexContainer} ${style.clearBorder}`}>
  //     <Logo />
  //     <Divider hidden />
  //     <Form onSubmit={this.handleSubmit} className={style.authForm}>
  //       <Form.Field className={style.authFormField} style={{textAlign: 'left'}}>
  //         {this.renderPasswordInput()}
  //         {this.renderPasswordHint()}
  //       </Form.Field>
  //       <Divider hidden />
  //       <Button type='submit' content='Unlock' primary className={style.buttonNav} />
  //       <br />
  //       <a onClick={this.doDisplayRestore.bind(this)}>Restore wallet</a>
  //     </Form>
  //   </Container>
  // }

  closeView() {
    postMessage(window, {
      type: 'vynos/parent/hideFull',
    })
  }

  render() {
    if (this.state.displayRestore) {
      return <RestorePage goBack={this.doneDisplayRestorePage.bind(this)} />
    }

    return (
      <div className={style.fullContainer}>
        <div className={style.loginHeader}>
          <WalletMiniCard
            className={style.loginWalletMiniCard}
            onClick={this.closeView}
            isLocked
            inverse
            alwaysLarge
          />
        </div>
        <div className={style.content}>
          <WalletCard
            width={275}
            cardTitle="SpankCard"
            companyName="SpankChain"
            name="spanktoshi"
            className={style.funnelWalletCard}
          />
          <div className={style.funnelTitle}>Login to SpankCard</div>
          <TextBox className={style.passwordTextBox}>
            We see you already have a SpankWallet, please login.
          </TextBox>
          <Input
            placeholder="Password"
            type="password"
            className={style.passwordInput}
            onChange={this.handleChangePassword}
          />
          <div className={style.funnelFooter}>
            <Button
              type="secondary"
              content="Restore SpankWallet"
              onClick={this.doDisplayRestore}
              isInverse
              isMini
            />
            <Button
              content="Next"
              onClick={this.handleSubmit}
              isInverse
              isMini
            />
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): UnlockPageProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default connect<UnlockPageProps, undefined, any>(mapStateToProps)(UnlockPage)
