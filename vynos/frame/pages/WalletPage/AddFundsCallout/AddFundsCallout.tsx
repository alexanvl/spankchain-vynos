import * as React from "react"
import Button from "../../../components/Button"

const s = require('../styles.css')


export class AddFundsCallout extends React.Component<any, any> {
  render() {

    return (
      <div className={s.subpageWrapper}>
        <Button to="/wallet/receive" content="Add funds to your card" isFullWidth />
      </div >
    )
  }
}

export default AddFundsCallout
