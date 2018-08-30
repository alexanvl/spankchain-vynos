import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const LoadingSpinner: React.SFC<any> = function (props) {
  const { className } = props

  return (
    <div className={classnames(s.spCircle, className)} />
  )
}

export default LoadingSpinner