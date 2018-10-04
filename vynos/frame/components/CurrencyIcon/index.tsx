import * as React from 'react'
import {connect} from 'react-redux'
import * as classnames from 'classnames'
import {FrameState} from '../../redux/FrameState'
import { CurrencyType } from '../../../worker/WorkerState'
import IconUsd from './IconUsd'
import IconBooty from './IconBooty'
import IconEth from './IconEth'
import IconFin from './IconFin'

const s = require('./style.css')

export interface Props {
  className?: string
  currency?: CurrencyType
  baseCurrency: CurrencyType
  color?: string
  big?: boolean
  spaceAround?: boolean
}

let colors: any = {
  'green': '#55a451',
  'pink': '#ff3b81',
  'grey': '#797979',
  'white': '#ffffff'
}

export class CurrencyIcon extends React.Component<Props, any> {
  render() {
    let { baseCurrency, currency, big, spaceAround, color = 'grey', className } = this.props
    color = colors[color]
    const c = currency || baseCurrency
    let icon 
    switch (currency) {
      case 'USD':
        icon = <IconUsd fill={color} />
        break
      case 'BOOTY': 
        icon =<IconBooty fill={color}/>
        break
      case 'ETH': 
        icon = <IconEth fill={color} borderFill={color}/>
        break
      case 'FINNEY': 
        icon = <IconFin fill={color}/>
        break
    }

    return (
      <div
        style={{ color: color || 'inherit' }}
        className={classnames(s.currency, className, {
          [s.big]: big,
          [s.spaceAround]: spaceAround,
        })}
      >   
        {icon}
      </div>
    )
  }
}

function mapStateToProps(state: FrameState)  {
  return {
    baseCurrency: state.shared.baseCurrency
  }
}

export default connect(mapStateToProps)(CurrencyIcon)
