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

  render () {
    const {
      type,
      className,
      isInverse,
      disabled,
      isMini
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
        {this.props.content}
      </button>
    )
  }

  onClick (e: any) {
    if (this.props.to) {
      this.context.router.history.push(this.props.to)
    }

    if (this.props.onClick) {
      this.props.onClick(e)
    }
  }
}

export default Button
