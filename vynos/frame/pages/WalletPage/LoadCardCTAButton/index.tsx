import * as React from 'react'
import { connect } from 'react-redux'
import AddFunds from '../AddFunds'
import {FrameState} from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import Button from '../../../components/Button/index'
import Currency, {CurrencyType} from '../../../components/Currency/index'
import * as classnames from 'classnames'
import entireBalance from '../../../lib/entireBalance'
import {FIVE_FINNEY} from '../../../../lib/constants'
import BN = require('bn.js')

const s = require('./index.css')

const finneyInverse = require('../../../components/CurrencyIcon/style.css').inverse

export interface MapStateToProps {
  workerProxy: WorkerProxy
  walletBalance: BN
  cardBalance: BN
  hasActiveDeposit: boolean
}

export type Props = MapStateToProps

export class LoadCardCTAButton extends React.Component<Props> {
  load = async () => {
    const amount = await entireBalance(this.props.workerProxy, this.props.walletBalance)
    await this.props.workerProxy.deposit(amount)
  }

  renderLoadContent () {
    return this.props.hasActiveDeposit
      ? <span className={s.loaderWrapper}><span className={s.spCircle} /> <span>Card is being filled</span></span>
      : () => (
        <span className={s.loadUpWrapper}>
          <span>Load up </span>
          <Currency
            amount={this.props.walletBalance}
            inputType={CurrencyType.WEI}
            outputType={CurrencyType.FINNEY}
            className={s.loadUpCurrency}
            unitClassName={`${finneyInverse} ${s.finneyUnitInText}`}
            showUnit
          />
          <span> into SpankCard</span>
        </span>
      )
  }

  renderDepositMoreContent () {
    return (
      <span className={s.loadUpWrapper}>
        <span>Minimum SpankCard refill is </span>
        <Currency
          amount={FIVE_FINNEY}
          inputType={CurrencyType.WEI}
          outputType={CurrencyType.FINNEY}
          className={s.loadUpCurrency}
          unitClassName={`${finneyInverse} ${s.finneyUnitInText}`}
          showUnit
        />
      </span>
    )
  }

  render () {
    const {walletBalance, cardBalance, hasActiveDeposit} = this.props

    if (cardBalance.gt(new BN(0))) {
      return <noscript />
    }

    if (walletBalance.eq(new BN(0))) {
      return <AddFunds/>
    }

    const tooLow = walletBalance.lt(FIVE_FINNEY)
    const btnClass = classnames({
      [s.loading]: hasActiveDeposit,
      [s.tooLow]: tooLow
    })

    return (
      <div className={s.container}>
        <Button
          className={btnClass}
          content={tooLow && !hasActiveDeposit ? this.renderDepositMoreContent() : this.renderLoadContent()}
          disabled={hasActiveDeposit || tooLow}
          onClick={this.load}
        />
        {hasActiveDeposit ? <span className={s.small}>Estimated time: Up to 4 minutes.</span> : null}
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): MapStateToProps {
  return {
    walletBalance: new BN(state.shared.balance || 0),
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy,
    hasActiveDeposit: state.shared.hasActiveDeposit
  }
}

export default connect(mapStateToProps)(LoadCardCTAButton)

