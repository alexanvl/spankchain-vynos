import * as React from 'react' // eslint-disable-line no-unused-vars
import * as classnames from 'classnames'
import {PropTypes} from 'react'

const s = require('./style.css')

export const BUTTON_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary'
}

export type ButtonType = 'primary' | 'secondary' | 'tertiary'

export interface ButtonProps {
  type?: ButtonType
  className?: string
  isInverse?: boolean
  disabled?: boolean
  isMini?: boolean
  content: any
  onClick?: (e: any) => void
  to?: string
}

class Button extends React.Component<ButtonProps> {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired
      }).isRequired
    }).isRequired
  };

  static defaultProps = {
    type: BUTTON_TYPES.PRIMARY,
    className: '',
  }

  render () {
    const {
      type,
      className,
      isInverse,
      disabled,
      isMini,
      content,
    } = this.props

    const cn = classnames(s.btn, className, {
      [s.primary]: type === BUTTON_TYPES.PRIMARY,
      [s.secondary]: type === BUTTON_TYPES.SECONDARY,
      [s.tertiary]: type === BUTTON_TYPES.TERTIARY,
      [s.inverse]: isInverse,
      [s.mini]: isMini
    })

    return (
      <button
        className={cn}
        onClick={(e: any) => this.onClick(e)}
        disabled={disabled}
      >
        {typeof content === 'function' ? content() : content }
      </button>
    )
  }

  onClick (e: any) {
    console.log(this.props.to)

    if (this.props.to) {
      this.context.router.history.push(this.props.to)
      console.log(this.context.router)
    }

    if (this.props.onClick) {
      this.props.onClick(e)
    }
  }
}

export default Button
