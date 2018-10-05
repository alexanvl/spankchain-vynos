import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const LoadingSpinner: React.SFC<any> = function (props) {
  const { className, inverted, big, children, noAnimate } = props

  return (
    <div className={classnames(s.spCircle, className, { [s.inverted]: inverted, [s.big]: big, [s.animated]: !noAnimate })} >{children}</div>
  )
}

export default LoadingSpinner