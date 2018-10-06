import * as React from 'react'
import * as classnames from 'classnames'
import Currency from '../Currency/index'
import CurrencyIcon from '../CurrencyIcon'
import { FrameState } from '../../redux/FrameState'
import { connect } from 'react-redux'
import BN = require('bn.js')
import LoadingSpinner from '../LoadingSpinner'
import { alertMessagesLong } from '../transactionStates'
import Tooltip from '../Tooltip'
import { CurrencyType, MigrationState } from '../../../worker/WorkerState';
import IconAlert from './IconAlert'

const s = require('./style.css')

export interface StateProps {
  name?: string
  currencyType?: CurrencyType
  migrationState?: MigrationState
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

  state = {
    animated: true,
    initial: true
  } as WalletCardState

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
      currencyType,
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
      <div className={s.wrapper} style={{
        width: width + 'px',
        height: height + 'px'
      }}>
        <div
          className={classnames(..._classes)}
          style={{
            backgroundImage: imageUrl ? 'url(' + imageUrl + ')' : '',
            backgroundColor,
            color,
            backgroundSize: 'cover',
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
            {this.renderBadges()}

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
            {currencyValue ? this.renderCurrencyValue(currencyType!) : null}
          </div>
        </div>
      </div >
    )
  }

  renderCurrencyValue(currencyType: CurrencyType) {
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
            [s.initial]: this.state.initial,
          })}
          currency={currencyType}
          color="white"
          big
        />
        <Currency key="value" amount={this.props.currencyValue!} outputType={currencyType} inputType={currencyType} color="white"/>
      </div>
    )
  }
  renderBadges() {
    let content = null
    let triggerElement = null
    let { migrationState } = this.props
    
    if (this.props.isLoading) {
      content = "Your funds are being processed. This may take a few minutes."
      triggerElement = <LoadingSpinner className={s.spinner} />
    }
    
    if (migrationState) {
      switch (migrationState) {
        case 'AWAITING_ETH':
          content = alertMessagesLong[migrationState]
          triggerElement = <IconAlert />
          break
        case 'MIGRATING':
          content = alertMessagesLong[migrationState]
          triggerElement = <LoadingSpinner className={s.spinner} />
          break
        case 'MIGRATION_FAILED':
          content = alertMessagesLong[migrationState]
          triggerElement = <IconAlert />
          break
        case 'DONE':
          break
      }
    }

    return content && triggerElement && (
      <span>
        <Tooltip content={content} trigger="hover">
            {triggerElement}
        </Tooltip>
      </span>
    )
  }
}

function mapStateToProps(state: FrameState, ownProps: WalletCardProps): StateProps {
  return {
    name: ownProps.name || (state.shared.username || ''),
    currencyType: state.shared.baseCurrency,
    migrationState: state.shared.migrationState,
  }
}

export default connect(mapStateToProps)(WalletCard)
