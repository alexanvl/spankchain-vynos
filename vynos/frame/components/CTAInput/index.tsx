import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const CTAInput: React.SFC<any> = function(props) {
  const {
    className,
    checked,
    onChange,
    value,
    ctaContent,
    isInverse,
    isConnected,
  } = props

  return (
    <div className={classnames(className, s.ctaInput, {
      [s.inverse]: isInverse,
      [s.connected]: isConnected,
    })}>
      {value}
      <div className={s.ctaInputText}>
        {ctaContent()}
      </div>
    </div>
  )
}

CTAInput.defaultProps = {
  className: '',
  checked: null,
  onChange() {},
  isInverse: false,
}

export default CTAInput
