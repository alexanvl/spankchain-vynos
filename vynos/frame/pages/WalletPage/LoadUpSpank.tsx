import * as React from "react"
import Web3 = require('web3')
import {connect} from "react-redux"
// import {Dispatch} from 'redux'
// import {MouseEvent} from "react"
import * as classnames from 'classnames'
// import * as copy from 'copy-to-clipboard'
// import * as qr from 'qr-image'
// import postMessage from "../../lib/postMessage"
import {FrameState} from "../../redux/FrameState"
// import WorkerProxy from "../../WorkerProxy"
import * as actions from "../../redux/actions"
import Input from "../../components/Input/index"
import Button from "../../components/Button/index"

const s = require('./LoadUpSpank.css')


export interface MapStateToProps {
  walletBalance: string|null
}

export interface MapDispatchToProps {
  
}

export type LoadUpSpankProps = MapStateToProps & MapDispatchToProps


export class LoadUpSpank extends React.Component<LoadUpSpankProps, any> {

  render() {
    return (
      <div className={s.container}>
        <div className={s.header}>
          You have funds in your wallet, please load up your SpankCard
        </div>
        <div className={s.footer}>
          <Button content="Load up $69 into SpankCard" />
        </div>
      </div>
    )
  }
}

function mapStateToProps(state: FrameState): MapStateToProps {
  return {
    walletBalance: state.wallet.main.balance,
  }
}

export default connect(mapStateToProps)(LoadUpSpank)
