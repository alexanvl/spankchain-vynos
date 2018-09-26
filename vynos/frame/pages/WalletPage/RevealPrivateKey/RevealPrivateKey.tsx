import * as React from 'react';
import { connect } from 'react-redux'
import * as copy from 'copy-to-clipboard'
import WorkerProxy from '../../../WorkerProxy'
import { FrameState } from '../../../redux/FrameState'
import Input from '../../../components/Input'
import Button from '../../../components/Button'
import CTAInput from "../../../components/CTAInput"
import bip39 = require('bip39')

const style = require('./style.css')
const baseStyle = require('../styles.css')

export interface RevealPrivateKeyProps {
  workerProxy: WorkerProxy
}

export interface RevealPrivateKeyState {
  seeds: string[]
  seedError?: string
  privateKey?: string
  isCopied: boolean
}

const alpha = /^[a-z]*$/i

class RevealPrivateKey extends React.Component<RevealPrivateKeyProps, RevealPrivateKeyState> {
  timeout: any

  state = {
    seeds: [],
    isCopied: false,
  } as RevealPrivateKeyState

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  handleSubmitSeed = async () => {
    let privateKey
    const phrase = this.state.seeds.join(' ')

    if (!bip39.validateMnemonic(phrase)) {
      this.setState({
        seedError: 'Invalid seed phrase. Did you forget or mistype a word?'
      })

      return
    }

    try {
      privateKey = await this.props.workerProxy.revealPrivateKey(phrase)
    } catch (e) {
      this.setState({
        seedError: 'Please enter the correct seed words for your wallet.'
      })

      return
    }

    this.setState({
      privateKey
    })
  }

  updateSeed = (i: number, e: any) => {
    const value = e.target.value.toLowerCase()

    if (!value.match(alpha)) {
      return
    }

    const seeds = [].concat(this.state.seeds as any) as string[]
    seeds[i] = value

    this.setState({
      seeds
    })
  }

  setSeed(i: number) {
    return {
      value: this.state.seeds[i] || '',
      onChange: (e: KeyboardEvent) => this.updateSeed(i, e)
    }
  }

  renderFields() {
    const out = []

    for (let i = 0; i < 12; i++) {
      out.push(
        <li key={i} className={style.backupFieldWrapper}>
          <Input
            autoFocus={i === 0}
            className={style.backupField}
            {...this.setSeed(i)}
            inverse
          />
        </li>
      )
    }

    return (
      <ol className={style.backupFields}>
        {out}
      </ol>
    )
  }

  onCopyAddress = () => {
    const { privateKey } = this.state;

    if (privateKey) {
      copy(privateKey)
      this.setState({
        isCopied: true,
      })

      this.timeout = setTimeout(() => {
        this.setState({ isCopied: false })
      }, 2000)
    }
  }

  renderPrivateKey() {
    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Your private key</div>
        <div className={style.descriptionWrapper}>
          <div className={style.description}>You can enter your private key at <a href="https://mycrypto.com/account">MyCrypto</a>.</div>
        </div>
        <div className={style.contentWrapper}>
          <CTAInput
            isInverse
            className={style.ctaInput}
            ctaInputValueClass={style.ctaInputValue}
            ctaContentClass={style.ctaInputContent}
            value={this.state.privateKey}
            ctaContent={() => (
              <div className={style.ctaContentWrapper} onClick={this.onCopyAddress}>
                <div className={style.ctaIcon} />
                <span className={style.ctaText}>
                  {this.state.isCopied ? 'Copied' : 'Copy'}
                </span>
              </div>
            )}
          />
        </div>
      </div>
    )
  }

  renderSeedInputs() {
    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Reveal private key</div>
        <div className={baseStyle.description}>Enter your seed words to reveal your private key.</div>
        {this.state.seedError && <div className={style.error}>{this.state.seedError}</div>}
        {this.renderFields()}
        <div className={style.buttonWrapper}>
          <Button
            content="Reveal Private Key"
            onClick={this.handleSubmitSeed}
          />
        </div>
      </div>
    )
  }

  render() {
    return (
      <div>
        {this.state.privateKey ? this.renderPrivateKey() : this.renderSeedInputs()}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): RevealPrivateKeyProps {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(RevealPrivateKey)
