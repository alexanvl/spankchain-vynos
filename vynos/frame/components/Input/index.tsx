import * as React from 'react' // eslint-disable-line no-unused-vars
import * as classnames from 'classnames'

const s = require('./style.css')

const Input: React.SFC<any> = function(props) {
  const {
    type,
    className,
    disabled,
    placeholder,
    onChange,
    errorMessage,
    value,
  } = props

  return (
    <div className={s.wrapper}>
      <input
        type={type}
        className={classnames(s.input, className, {
          [s.error]: errorMessage,
        })}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
      <div className={s.errorMessage}>{errorMessage}</div>
    </div>
  )
}

Input.defaultProps = {
  type: 'text',
  className: '',
  disabled: false,
}

export default Input
