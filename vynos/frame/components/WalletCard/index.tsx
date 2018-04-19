import * as React from 'react'
import {BigNumber} from 'bignumber.js'
import * as classnames from 'classnames'
import Currency, {CurrencyType} from '../Currency/index'
import CurrencyIcon, {CurrencyIconType} from '../CurrencyIcon'
import {FrameState} from '../../redux/FrameState'
import {connect} from 'react-redux'
import {DOMElement} from 'react'

const s = require('./style.css')

export interface StateProps {
  name?: string
}

export interface WalletCardProps extends StateProps {
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
  currencySize?: string
  onToggleUsdFinney?: (isShowingUsd: boolean) => void
}

export interface WalletCardState {
  isShowingUsd: boolean
  animated: boolean,
  initial: boolean
}

export class WalletCard extends React.Component<WalletCardProps, WalletCardState> {
  static defaultProps: WalletCardProps = {
    className: '',
    backgroundColor: '#fff',
    color: '#ff007f',
    width: 300,
    currency: '$',
    onToggleUsdFinney: () => null
  }

  icon: any

  constructor (props: WalletCardProps) {
    super(props)

    this.state = {
      isShowingUsd: false,
      animated: true,
      initial: true
    }

    this.toggleUsdFinney = this.toggleUsdFinney.bind(this)
  }

  toggleUsdFinney () {
    const isShowingUsd = !this.state.isShowingUsd

    this.setState({
      isShowingUsd,
      animated: false,
      initial: false
    })

    this.props.onToggleUsdFinney!(isShowingUsd)

    setTimeout(() => this.setState({
      animated: true
    }), 0)
  }

  render () {
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
    } = this.props

    const height = width! * (18 / 30)
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
          {currencyValue ? this.renderCurrencyValue() : null}
        </div>
      </div>
    )
  }

  renderCurrencyValue () {
    return (
      <div
        className={s.currency}
        style={{
          fontSize: this.props.currencySize + 'px',
          lineHeight: this.props.currencySize + 'px',
          color: this.props.color
        }}
        onClick={this.toggleUsdFinney}
      >
        <CurrencyIcon
          className={classnames(s.currencyIcon, {
            [s.animating]: this.state.animated,
            [s.initial]: this.state.initial
          })}
          currency={this.state.isShowingUsd ? CurrencyIconType.USD : CurrencyIconType.FINNEY}
          reverse
        />
        <Currency key="value" amount={this.props.currencyValue} outputType={this.state.isShowingUsd ? CurrencyType.USD : CurrencyType.FINNEY} />
      </div>
    )
  }
}

function mapStateToProps (state: FrameState, ownProps: WalletCardProps): StateProps {
  return {
    name: ownProps.name || (state.shared.username || '')
  }
}

export default connect(mapStateToProps)(WalletCard)
