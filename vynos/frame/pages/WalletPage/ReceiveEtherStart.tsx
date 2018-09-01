import * as React from "react"
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
import Input from "../../components/Input"
import Button from "../../components/Button"
import { Link } from 'react-router-dom'

const s = require('./ReceiveEther.css')


export interface Props {
  address: string | null
}

export interface State {
  isCopied: boolean
}

function renderQR(address: string | null) {
  if (!address) {
    return null
  }

  let pngBuffer = qr.imageSync(address, { type: 'png', margin: 1 }) as Buffer
  let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')

  return (
    <img className={s.qrImage} src={dataURI} />
  )
}

export class ReceiveEtherStart extends React.Component<Props, State> {
  timeout: any

  state = {
    isCopied: false,
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  onCopyAddress = () => {
    const { address } = this.props;

    if (address) {
      copy(address)
      this.setState({
        isCopied: true,
      })

      this.timeout = setTimeout(() => {
        this.setState({ isCopied: false })
      }, 2000)
    }
  }

  render() {
    const {
      address,
    } = this.props;

    return (
      <div className={s.container}>
        <div className={s.header}>Add Ether to your card</div>
        <div className={s.label}>Address</div>
        <Input
          disabled={true}
          value={address}
          className={s.input}
        />
        <div className={s.bottomWrapper}>
          <div className={s.qrWrapper}>
            {renderQR(address)}
          </div>
          <div className={s.buttonWrapper}>
            <div className={s.description}>Only send Ether (ETH) to this address.</div>
            <Button
              type='primary'
              onClick={this.onCopyAddress}
              isFullWidth
              content={<span className={s.buttonContent}>
                <div className={s.ctaIcon} />
                <span className={s.ctaText}>
                  {this.state.isCopied ? 'Copied' : 'Copy your address'}
                </span>
              </span>
              } />
            <Button
              type='secondary'
              to="https://help.spankchain.com/hc/en-us/articles/360004669831-Receiving-ETH"
              className={s.guideButton}
              content="Step-by-Step Guide"
              isFullWidth
            />
          </div>

        </div>
        <div className={s.recoverText}>
          <Link
            to="/wallet/reveal"
          >
            Reveal Private Key (Advanced)
          </Link>
        </div>
      </div>
    )
  }
}

export default ReceiveEtherStart
