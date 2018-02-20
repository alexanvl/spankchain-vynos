import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const CTAInput: React.SFC<any> = function(props) {
  const { className, checked, onChange, value, ctaContent } = props

  return (
    <div className={classnames(className, s.ctaInput)}>
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
}

export default CTAInput
