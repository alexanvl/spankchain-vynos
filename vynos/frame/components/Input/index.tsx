import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const Input: React.SFC<any> = function (props) {
  const {
    type,
    className,
    disabled,
    placeholder,
    onChange,
    onBlur,
    errorMessage,
    value,
    onKeyDown,
    autoFocus,
    inverse,
    onPaste,
    inputRef,
    name,
    onClick,
    disableError,
  } = props

  return (
    <div className={classnames(s.wrapper, className)} onClick={onClick}>
      <input
        type={type}
        ref={inputRef}
        className={classnames(s.input, {
          [s.error]: errorMessage,
          [s.inverse]: inverse
        })}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        onPaste={onPaste}
        data-sel={name}
        name={name}
      />
      {!disableError && <div className={classnames(s.errorMessage, {
        [s.inverse]: inverse
      })}>{errorMessage}</div>
      }
    </div>
  )
}

Input.defaultProps = {
  type: 'text',
  className: '',
  disabled: false,
  autoFocus: false
}

export default Input
