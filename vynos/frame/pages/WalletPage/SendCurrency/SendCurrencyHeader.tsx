import * as React from 'react'

const baseStyle = require('../styles.css')

export const SendCurrencyHeader = ({bootySupport}:any) => (
  <React.Fragment>
    <div className={baseStyle.header}>Send Ether</div>
    {bootySupport && <div className={baseStyle.description}>
      Your full BOOTY balance will be converted into Ether and sent to the address you specify.
      <br />
      <br />
      Partial sending will be available soon ❤️
      <br />
    </div>}
  </React.Fragment>
)