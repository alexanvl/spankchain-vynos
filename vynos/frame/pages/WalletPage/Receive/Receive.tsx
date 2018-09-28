import * as React from "react"
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
import * as classnames from 'classnames'
import { Link } from 'react-router-dom'
import Input from "../../../components/Input"
import Button from "../../../components/Button"
import Currency from '../../../components/Currency'
import { CurrencyType } from "../../../../worker/WorkerState";

const s = require('./receive.css')
const baseStyle = require('../styles.css')


export interface Props {
  address: string | null
  bootySupport?: boolean
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

export class Receive extends React.Component<Props, State> {
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
      bootySupport,
    } = this.props;

    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Receive Ether {bootySupport && 'to get Booty'}</div>
        <div className={classnames(baseStyle.label, s.mediumUp)}>
          { bootySupport ? 'When you receive ETH in your SpankPay account, it will automatically get converted to BOOTY so you can start tipping.'
            : 'Only send Ether (ETH) to this address.'
          }
        </div>

        <div className={classnames(s.minAmount, s.smallDown)}>Min Amount
          <Currency
            amount={0.04}
            outputType={CurrencyType.ETH}
            inputType={CurrencyType.ETH}
            unitClassName={s.minIcon}
            showUnit
          />
        </div>
        { bootySupport && <div className={classnames(s.minAmount, s.smallDown)}>Max Amount
          <Currency
            amount={69}
            outputType={CurrencyType.ETH}
            inputType={CurrencyType.USD}
            unitClassName={s.minIcon}
            showUnit
          />
        </div> }
        <Input
          disabled={true}
          value={address}
          className={s.input}
          onClick={this.onCopyAddress}
          disableError
        />
        <div className={s.bottomWrapper}>
          <div className={s.qrWrapper}>
            {renderQR(address)}
          </div>
          <div className={s.buttonWrapper}>
            <div className={classnames(s.minAmount, s.mediumUp)}>Min Amount
              <Currency
                amount={0.04}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.ETH}
                unitClassName={s.minIcon}
                showUnit
              />
            </div>
            { bootySupport && <div className={classnames(s.minAmount, s.mediumUp)}> Max Amount
              <Currency
                amount={69}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.USD}
                unitClassName={s.minIcon}
                showUnit
              />
            </div>}
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

export default Receive
