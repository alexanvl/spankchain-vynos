import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const Checkbox: React.SFC<any> = function(props) {
  const { className, checked, onChange, name } = props

  return (
    <label data-sel={name} className={classnames(s.container, className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
      />
      <span className={s.checkmark}></span>
    </label>
  )
}

Checkbox.defaultProps = {
  className: '',
  checked: null,
}

export default Checkbox
