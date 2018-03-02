import * as React from 'react'
import Button from '../../../components/Button/index'

const s = require('./index.css')

export interface Props {
  buttonClass?: string
  to?: string
}

export default class WalletCTAButton extends React.Component<Props> {
  static defaultProps = {
    buttonClass: '',
  }

  render() {
    return (
      <div className={s.container}>
        <Button
          className={this.props.buttonClass}
          to={this.props.to}
          content="Go Back to SpankCard"
        />
      </div>
    )
  }
}
