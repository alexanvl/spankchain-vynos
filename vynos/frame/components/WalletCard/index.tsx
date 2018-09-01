import * as React from 'react'
import * as classnames from 'classnames'
import Currency, { CurrencyType } from '../Currency/index'
import CurrencyIcon, { CurrencyIconType } from '../CurrencyIcon'
import { FrameState } from '../../redux/FrameState'
import { connect } from 'react-redux'
import BN = require('bn.js')
import LoadingSpinner from '../LoadingSpinner';
import Tooltip from '../Tooltip'

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
  currencyValue?: BN
  currencySize?: string
  gradient?: boolean
  isLoading?: boolean
}

export interface WalletCardState {
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
  }

  icon: any

  constructor(props: WalletCardProps) {
    super(props)

    this.state = {
      animated: true,
      initial: true
    }
  }

  render() {
    const {
      cardTitle,
      name,
      imageUrl,
      backgroundColor,
      color,
      className,
      gradient,
      width,
      currencyValue,
      isLoading,
    } = this.props

    const height = width! * (18 / 30)
    const titleSize = height * .1333
    const companyNameSize = titleSize * .6

    const _classes = [
      s.card,
      className,
      ...(gradient ? [s.gradient] : [])
    ]

    return (
      <div
        className={classnames(..._classes)}
        style={{
          backgroundImage: imageUrl ? 'url(' + imageUrl + ')' : '',
          backgroundColor,
          color,
          backgroundSize: 'cover',
          width: width + 'px',
          height: height + 'px'
        }}
      >
        <div className={s.top} style={{ color }}>
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
          {isLoading && (
            <span>
              <Tooltip content="Your funds are being processed. This may take a few minutes." trigger="click">
                <LoadingSpinner className={s.spinner} />
              </Tooltip>
            </span>
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

  renderCurrencyValue() {
    return (
      <div
        className={s.currency}
        style={{
          fontSize: this.props.currencySize + 'px',
          lineHeight: this.props.currencySize + 'px',
          color: this.props.color
        }}
      >
        <CurrencyIcon
          className={classnames(s.currencyIcon, {
            [s.animating]: this.state.animated,
            [s.initial]: this.state.initial
          })}
          currency={CurrencyType.FINNEY}
          reverse
        />
        <Currency key="value" amount={this.props.currencyValue} outputType={CurrencyType.FINNEY} decimals={0} />
      </div>
    )
  }
}

function mapStateToProps(state: FrameState, ownProps: WalletCardProps): StateProps {
  return {
    name: ownProps.name || (state.shared.username || '')
  }
}

export default connect(mapStateToProps)(WalletCard)
