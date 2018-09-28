import * as React from "react"
import BN = require('bn.js')
import { connect } from 'react-redux'
import Button from "../../../components/Button"
import Currency from '../../../components/Currency'
import { Link } from 'react-router-dom'
import { CurrencyType } from "../../../../worker/WorkerState";

const s = require('./receive.css')
const vs = require('../../../styles/ynos.css')
const baseStyle = require('../styles.css')

export interface State {
  isCopied: boolean,
  gas: String,
  gasPrice: String,
}

export class ReceiveEther extends React.Component<any, State> {

  state = {
    isCopied: false,
    gas: '53000',
    gasPrice: '40'
  }

  componentWillMount() {
    this.getGas()
  }

  getGas() {
    const {
      eth: { estimateGas, getGasPrice },
      fromWei,
    } = this.props.workerProxy.web3

    estimateGas({}, (err: any, data: any) => {
      if (err) {
        return
      }

      this.setState({ gas: '' + data })
    })

    getGasPrice((err: any, data: any) => {
      if (err) {
        return
      }

      // PR comment:  this doesn't actually do anything because fromWei is undefined? 
      // which is also the case in SendEther.tsx
      this.setState({
        gasPrice: '' + fromWei(data.toNumber(), 'gwei'),
      })
    })
  }

  totalGasCost() {
    let gp = new BN(this.state.gasPrice)
    let g = new BN(this.state.gas)

    return gp.mul(g).toString()
  }

  render() {

    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Receive Ether to get Booty</div>
        <div className={baseStyle.description}>When you receive ETH in your SpankPay account, it will automatically get converted to BOOTY so you can start tipping.</div>
        <div style={{textAlign: 'center'}}>
          <Currency
            amount={1}
            outputType={CurrencyType.BOOTY}
            inputType={CurrencyType.BOOTY}
            unitClassName={s.currencyIcon}
            showUnit
          />&nbsp;&nbsp;=&nbsp;&nbsp;
          <Currency
            amount={1}
            outputType={CurrencyType.USD}
            inputType={CurrencyType.USD}
            unitClassName={s.currencyIcon}
            showUnit
          />
        </div>
        <div className={s.whiteRect}>
          <div className={s.left}>You can get 69 BOOTY at a time. When you blow your entire load of BOOTY, you can load up with more.</div>
          <div className={s.right}>
            <div className={s.quarter}>
              <div className={s.currencyWrap}>Min amount</div>
              <div className={s.currencyWrap}>Max amount</div>
            </div>
            <div className={s.quarter}>
              <Currency
                amount={0.04}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.ETH}
                unitClassName={s.currencyIcon}
                showUnit
              />
              <Currency
                amount={69}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.USD}
                unitClassName={s.currencyIcon}
                showUnit
              />
            </div>
          </div>
        </div >
        <Button to="/wallet/receive/start" content={<div className={vs.loginButton} />} isFullWidth />
        <div className={s.recoverText}>
          <Link
            to="/wallet/reveal"
          >
            Reveal Private Key (Advanced)
          </Link>
        </div>
      </div >
    )
  }
}

function mapStateToProps(state: any): any {
  return {
    workerProxy: state.temp.workerProxy,
  }
}
export default connect(mapStateToProps)(ReceiveEther)
