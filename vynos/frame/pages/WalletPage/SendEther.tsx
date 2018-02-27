import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
// import {Dispatch} from 'redux'
// import {MouseEvent} from "react"
import * as classnames from 'classnames'
// import * as copy from 'copy-to-clipboard'
// import * as qr from 'qr-image'
// import postMessage from "../../lib/postMessage"
// import {FrameState} from "../../redux/FrameState"
// import WorkerProxy from "../../WorkerProxy"
// import * as actions from "../../redux/actions"
import Input from "../../components/Input/index"
import Button from "../../components/Button/index"

const s = require('./SendEther.css')


export interface MapStateToProps {
  
}

export interface MapDispatchToProps {
  
}

export type SendEtherProps = MapStateToProps & MapDispatchToProps


export class SendEther extends React.Component<SendEtherProps, any> {

  render() {
    return (
      <div className={s.container}>
        <div className={s.header}>Send Ether</div>
        <div className={s.contentRow}>
          <div className={s.inputWrapper}>
            <div className={s.inputLabel}>Address</div>
            <Input className={s.input} placeholder="0x3930DdDf234..." />
          </div>
        </div>
        <div className={s.contentRow}>
          <div className={s.inputWrapper}>
            <div className={s.inputLabel}>Ether Amount</div>
            <Input className={s.input} type="number" placeholder="0.00" />
          </div>
          <div className={s.inputResult}>
            <div className={s.inputEqual}>=</div>
            <div className={s.inputTotal}>$0</div>
          </div>
        </div>
        <div className={s.footer}>
          <Button
            type="secondary"
            className={s.adjustGasButton}
            content="Adjust Gas Limit/Price"
          />
          <Button content="Next" />
        </div>
      </div>
    )
  }
}

// export default connect(
//   null,
//   null,
// )(SendEther)

export default SendEther
