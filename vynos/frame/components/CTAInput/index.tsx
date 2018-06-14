import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const CTAInput: React.SFC<any> = function(props) {
  const {
    className,
    ctaInputValueClass,
    ctaContentClass,
    value,
    name,
    ctaContent,
    isInverse,
    isConnected,
    isDisabled
  } = props

  return (
    <div className={classnames(className, s.ctaInput, {
      [s.inverse]: isInverse,
      [s.connected]: isConnected,
    })}>
      <div data-sel={name} className={classnames(s.ctaInputValue, ctaInputValueClass)}>
        {value}
      </div>
      <div className={classnames(s.ctaInputText, ctaContentClass, {
        [s.disabled]: isDisabled
      })}>
        {ctaContent()}
      </div>
    </div>
  )
}

CTAInput.defaultProps = {
  className: '',
  ctaContentClass: '',
  ctaInputValueClass: '',
  checked: null,
  onChange() {},
  isInverse: false,
  isDisabled: false
}

export default CTAInput
