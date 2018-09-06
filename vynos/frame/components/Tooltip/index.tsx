import * as React from 'react'
import RCTooltip from 'rc-tooltip'
import * as classnames from 'classnames'
import '!style-loader!css-loader!rc-tooltip/assets/bootstrap.css'
import '!style-loader!css-loader!./unprefixedStyle.css'


const s = require('./style.css')

export type Trigger = 'hover' | 'click' | 'focus'

export interface TooltipProps {
  content: any
  trigger?: Trigger
  className?: string
}

const Tooltip: React.SFC<TooltipProps> = function ({children, content, trigger = 'hover', className}) {

  return (
    <RCTooltip
      overlay={<div className={s.content}>{content}</div>}
      overlayClassName={classnames(s.tooltip, className)}
      arrowContent={<div className={s.arrow}></div>}
      placement="bottom"
      trigger={[trigger]}
    // visible={true} // makes tooltips always visible
    >
      <span className={s.trigger}>{children}</span>
    </RCTooltip>
  )
}

export default Tooltip
