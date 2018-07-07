import * as React from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import {cardBalance} from '../../../redux/selectors/cardBalance'
import Button from '../../../components/Button/index'
import Currency, {CurrencyType} from '../../../components/Currency/index'
import {BigNumber} from 'bignumber.js'
import * as classnames from 'classnames'
import entireBalance from '../../../lib/entireBalance'
import {TEN_FINNEY} from '../../../../lib/constants'

const s = require('./index.css')

const finneyInverse = require('../../../components/CurrencyIcon/style.css').inverse

export interface MapStateToProps {
  workerProxy: WorkerProxy
  walletBalance: BigNumber
  cardBalance: BigNumber
  pendingChannelIds: string[]
}

export type Props = MapStateToProps

export class LoadCardCTAButton extends React.Component<Props> {
  load = async () => {
    const amount = await entireBalance(this.props.workerProxy, this.props.walletBalance)
    await this.props.workerProxy.deposit(amount)
  }

  renderLoadContent () {
    const {pendingChannelIds} = this.props

    return pendingChannelIds && pendingChannelIds.length > 0
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
          amount={TEN_FINNEY}
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
    const {walletBalance, cardBalance, pendingChannelIds} = this.props

    if (walletBalance.eq(0) || cardBalance.gt(0)) {
      return <noscript />
    }

    const tooLow = walletBalance.lt(TEN_FINNEY)
    const isLoading = pendingChannelIds && pendingChannelIds.length > 0
    const btnClass = classnames({
      [s.loading]: isLoading,
      [s.tooLow]: tooLow
    })

    return (
      <div className={s.container}>
        <Button
          className={btnClass}
          content={tooLow ? this.renderDepositMoreContent() : this.renderLoadContent()}
          disabled={isLoading || tooLow}
          onClick={this.load}
        />
        {isLoading ? <span className={s.small}>Estimated time: Up to 4 minutes.</span> : null}
      </div>
    )
  }
}

function mapStateToProps (state: FrameState): MapStateToProps {
  return {
    walletBalance: new BigNumber(state.shared.balance || 0),
    cardBalance: cardBalance(state.shared),
    workerProxy: state.temp.workerProxy,
    pendingChannelIds: state.shared.pendingChannelIds
  }
}

export default connect(mapStateToProps)(LoadCardCTAButton)
