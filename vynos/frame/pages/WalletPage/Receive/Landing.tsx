import * as React from "react"
import * as classnames from 'classnames'
import BN = require('bn.js')
import { connect } from 'react-redux'
import Button from "../../../components/Button"
import Currency from '../../../components/Currency'
import CurrencyIcon from '../../../components/CurrencyIcon'
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
        <div className={s.content}>
          <div className={classnames(s.whiteRect, s.twoThirds)}>
            <div className={s.rectRow}>
            <span className={classnames(s.rowLabel, s.spaced)}>Min amount</span>
              <Currency
                amount={0.06}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.ETH}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
              <span className={s.rowSlash}>/</span>
              <Currency
                amount={0.06}
                outputType={CurrencyType.USD}
                inputType={CurrencyType.ETH}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
            </div>
            <div className={s.rectRow}> 
              <span className={classnames(s.rowLabel, s.spaced)}>Booty limit</span>
              <Currency
                amount={69}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.USD}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
              <span className={s.rowSlash}>/</span>
              <Currency
                amount={69}
                outputType={CurrencyType.USD}
                inputType={CurrencyType.USD}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
            </div>
            {/* <div className={s.rectRow}> 
              <span className={classnames(s.rowLabel, s.spaced)}>Gas costs</span>
              {/* TODO update these with real values /}
              <Currency
                amount={69}
                outputType={CurrencyType.ETH}
                inputType={CurrencyType.USD}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
              <span className={s.rowSlash}>/</span>
              <Currency
                amount={69}
                outputType={CurrencyType.USD}
                inputType={CurrencyType.USD}
                unitClassName={s.currencyIcon}
                className={s.inlineCurrency}
                showUnit
              />
            </div> */}
          </div >
          <div className={classnames(s.oneThird, s.spaced)}>Send Ether to your card and we’ll credit you up to 69 Booty. When you spend it all, you can exchange more. </div>
        </div>
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
