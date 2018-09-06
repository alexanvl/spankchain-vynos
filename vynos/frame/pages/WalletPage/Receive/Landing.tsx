import * as React from "react"
import BN = require('bn.js')
import { connect } from 'react-redux'
import Button from "../../../components/Button"
import Currency, { CurrencyType } from '../../../components/Currency'
import { Link } from 'react-router-dom'

const s = require('./style.css')
const vs = require('../../styles/ynos.css')

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
      <div className={s.container}>
        <div className={s.header}>Receive Ether</div>
        <div className={s.whiteRect}>
          <div className={s.left}>Ready to transfer some ETH and get tipping? Check the transfer amounts on the right, and then click to see a step-by-step guide. </div>
          <div className={s.right}>
            <div className={s.quarter}>
              <div className={s.currencyWrap}>Min amount </div>
              <div className={s.currencyWrap}>Max amount</div>
              <div className={s.currencyWrap}>Miner fee</div>
            </div>
            <div className={s.quarter}>
              <Currency
                amount={0.04}
                outputType={CurrencyType.USD}
                inputType={CurrencyType.ETH}
                unitClassName={s.currencyIcon}
                showUnit
              />
              <div>Unlimited</div>
              <Currency
                amount={this.totalGasCost()}
                outputType={CurrencyType.USD}
                inputType={CurrencyType.WEI}
                unitClassName={s.currencyIcon}
                showUnit
              /></div>
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
