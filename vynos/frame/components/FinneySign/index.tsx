import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

export interface Props {
  className?: string
  reverse?: boolean
}

const Finney: React.SFC<Props> = function(props) {
  return (
    <div
      className={classnames(s.finney, props.className, {
        [s.finneyInverse]: props.reverse
      })}
    />
  )
}

export default Finney
