import * as React from 'react'
import { BigNumber } from 'bignumber.js';
import * as classnames from 'classnames'
import Currency, { CurrencyType } from '../Currency/index'
import FinneySign from '../FinneySign/index'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'

const s = require('./style.css')

export interface StateProps {
  name: string
}

export interface WalletCardProps {
  cardTitle?: string
  companyName?: string
  name?: string
  imageUrl?: string
  backgroundColor?: string
  color?: string
  className?: string
  width?: number
  currency?: string
  currencyValue?: BigNumber
}

const WalletCard: React.SFC<any> = function (props) {
  const {
    cardTitle,
    companyName,
    name,
    imageUrl,
    backgroundColor,
    color,
    className,
    width,
    currencyValue
  } = props

  const height = width * (18 / 30)
  const titleSize = height * .1333
  const companyNameSize = titleSize * .6

  return (
    <div
      className={classnames(s.card, className)}
      style={{
        backgroundImage: imageUrl ? 'url(' + imageUrl + ')' : null,
        backgroundColor,
        color,
        width: width + 'px',
        height: height + 'px'
      }}
    >
      <div className={s.top} style={{color}}>
        <div
          className={s.cardTitle}
          style={{
            fontSize: titleSize + 'px',
            lineHeight: titleSize + 'px',
            color
          }}
        >
          {cardTitle}
        </div>
        {companyName && (
          <div
            className={s.companyName}
            style={{
              fontSize: companyNameSize + 'px',
              lineHeight: companyNameSize + 'px',
              color
            }}
          >
            by {companyName}
          </div>
        )}
      </div>
      <div className={s.bottom}>
        <div
          className={s.name}
          style={{
            fontSize: companyNameSize + 'px',
            lineHeight: companyNameSize + 'px',
            color
          }}
        >
          {name}
        </div>
        {currencyValue ? renderCurrencyValue(props) : null}
      </div>
    </div>
  )
}

function renderCurrencyValue (props: any) {
  return (
    <div
      className={s.currency}
      style={{
        fontSize: props.currencySize + 'px',
        lineHeight: props.currencySize + 'px',
        color: props.color
      }}>
      <FinneySign className={s.finneySign} reverse/>
      <Currency key="value" amount={props.currencyValue} outputType={CurrencyType.FINNEY}/>
    </div>
  )
}

WalletCard.defaultProps = {
  className: '',
  backgroundColor: '#fff',
  color: '#ff007f',
  width: 300,
  currency: '$'
}


function mapStateToProps (state: FrameState, ownProps: WalletCardProps): StateProps {
  return {
    name: ownProps.name || (state.shared.username || '')
  }
}

export default connect(mapStateToProps)(WalletCard)
