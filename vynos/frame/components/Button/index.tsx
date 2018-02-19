import * as React from 'react' // eslint-disable-line no-unused-vars
import * as classnames from 'classnames'

const s = require('./style.css')

export const BUTTON_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
}

const Button: React.SFC<any> = function(props) {
  const {
    type,
    content,
    className,
    isInverse,
    disabled,
    onClick,
    isMini,
  } = props

  return (
    <button
      className={classnames(s.btn, className, {
        [s.primary]: type === BUTTON_TYPES.PRIMARY,
        [s.secondary]: type === BUTTON_TYPES.SECONDARY,
        [s.tertiary]: type === BUTTON_TYPES.TERTIARY,
        [s.inverse]: isInverse,
        [s.mini]: isMini,
      })}
      onClick={onClick}
      disabled={disabled}
    >
      {props.content}
    </button>
  )
}

Button.defaultProps = {
  type: BUTTON_TYPES.PRIMARY,
  className: '',
  isInverse: false,
  disabled: false,
  isMini: false,
}

export default Button
