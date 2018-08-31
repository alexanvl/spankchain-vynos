import * as React from 'react'
import RCTooltip from 'rc-tooltip'
import '!style-loader!css-loader!rc-tooltip/assets/bootstrap.css'
import '!style-loader!css-loader!./unprefixedStyle.css'

const s = require('./style.css')

const Tooltip: React.SFC<any> = function (props) {
  const { children, content } = props

  return (
    <RCTooltip
      overlay={<React.Fragment>{content}</React.Fragment>}
      overlayClassName={s.tooltip}
      arrowContent={<div className={s.arrow}></div>}
      placement="bottom"
      trigger={['hover']}
      // visible={true} // makes tooltips always visible
    >
      <span className={s.trigger}>{children}</span>
    </RCTooltip>
  )
}

export default Tooltip
