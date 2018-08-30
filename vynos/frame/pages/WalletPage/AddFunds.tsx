import * as React from "react"
import Button from "../../components/Button"

const s = require('./AddFunds.css')


export class AddFunds extends React.Component<any, any> {
  render() {

    return (
      <div className={s.container}>
        <Button to="/wallet/receive" content="Add funds to your card" isFullWidth />
      </div >
    )
  }
}

export default AddFunds
