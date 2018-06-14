import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const TextBox: React.SFC<any> = function(props) {
  const { children, className, isInverse, name } = props

  return (
    <div data-sel={name} className={classnames(s.textbox, className, {
      [s.inverse]: isInverse
    })}>
      {children}
    </div>
  )
}

TextBox.defaultProps = {
  className: '',
}

export default TextBox
