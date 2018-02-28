import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
// import {Dispatch} from 'redux'
// import {MouseEvent} from "react"
import * as classnames from 'classnames'
import * as copy from 'copy-to-clipboard'
import * as qr from 'qr-image'
// import postMessage from "../../lib/postMessage"
// import {FrameState} from "../../redux/FrameState"
// import WorkerProxy from "../../WorkerProxy"
// import * as actions from "../../redux/actions"
import CTAInput from "../../components/CTAInput/index"
import Input from "../../components/Input/index"
import Button from "../../components/Button/index"

const s = require('./ReceiveEther.css')


export interface MapStateToProps {
  address: string|null
  headerText: string
  descriptionLineOne: string
  descriptionLineTwo: string
  linkText: string
}

export interface MapDispatchToProps {
  
}

export type ReceiveEtherProps = MapStateToProps & MapDispatchToProps

function renderQR(address: string|null) {
  if (!address) {
    return null
  }

  let pngBuffer = qr.imageSync(address, {type: 'png', margin: 1}) as Buffer
  let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')

  return (
    <img className={s.walletQR} src={dataURI} />
  )
}

export class ReceiveEther extends React.Component<ReceiveEtherProps, any> {

  render() {
    const {
      address,
      headerText,
      descriptionLineOne,
      descriptionLineTwo,
      linkText,
    } = this.props;

    return (
      <div className={s.container}>
        <div className={s.header}>{headerText}</div>
        <div className={s.descriptionWrapper}>
          <div className={s.description}>
            {descriptionLineOne}
          </div>
          <div className={s.description}>
            {descriptionLineTwo}
            <span className={s.seeTutorialText}>
              {`${linkText} ->`}
            </span>
          </div>
        </div>
        <div className={s.addressWrapper}>
          <CTAInput
            isInverse
            className={s.ctaInput}
            ctaContentClass={s.ctaInputContent}
            value={address}
            ctaContent={() => (
              <div className={s.ctaContentWrapper} onClick={() => address && copy(address)}>
                <div className={s.ctaIcon} />
                <span className={s.ctaText}>Copy</span>
              </div>
            )}
          />
        </div>
        <div className={s.qrWrapper}>
          <div className={s.qrDescription}>Only send Ether (ETH) to this address.</div>
          {renderQR(address)}
        </div>
      </div>
    )
  }
}

// export default connect(
//   null,
//   null,
// )(ReceiveEther)

export default ReceiveEther
