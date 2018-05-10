import * as React from 'react';
import * as classnames from 'classnames';
import Currency, { CurrencyType } from '../Currency/index'
import {FIVE_FINNEY} from '../../../lib/constants'

const walletPageStyles = require('../../pages/WalletPage/styles.css')
const ctaStyles = require('../CTAInput/style.css')
const s = require('./style.css')
const finneyInverse = require('../CurrencyIcon/style.css').inverse

export interface RefillButtonProps {
  isRefilling: boolean
  isTooLow: boolean
  onClick: () => void
}

export default class RefillButton extends React.Component<RefillButtonProps, any> {
  render () {
    const onClick = this.props.isRefilling || this.props.isTooLow ?
      noop : this.props.onClick

    const names = classnames(walletPageStyles.ctaContentWrapper, {
      [s.tooLow]: this.props.isTooLow
    })

    return (
      <div
        className={names}
        onClick={onClick}
      >
        <div className={ctaStyles.ctaDivider} />
        <span className={walletPageStyles.ctaText}>{this.props.isRefilling ? 'Refilling...' : 'Load Up SpankCard' }</span>
        <div className={s.tooLowTooltip}>
          <span>The minimum refill amount is</span>
          <Currency
            amount={FIVE_FINNEY}
            inputType={CurrencyType.WEI}
            outputType={CurrencyType.FINNEY}
            className={s.loadUpCurrency}
            unitClassName={`${finneyInverse} ${s.finneyUnitInText}`}
            showUnit
          />
        </div>
      </div>
    )
  }
}

function noop () {}
