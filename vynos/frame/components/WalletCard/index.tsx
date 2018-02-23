import * as React from 'react'
import * as classnames from 'classnames'

const s = require('./style.css')

const WalletCard: React.SFC<any> = function(props) {
  const {
    cardTitle,
    companyName,
    name,
    imageUrl,
    backgroundColor,
    color,
    className,
    width,
    currency,
    currencyValue,
  } = props

  const height = width * (18 / 30)
  const titleSize = height * .1333
  const companyNameSize = titleSize * .6
  const currencySize = titleSize * 2

  return (
    <div
      className={classnames(s.card, className)}
      style={{
        backgroundImage: imageUrl ? 'url(' + imageUrl + ')' : null,
        backgroundColor,
        color,
        width: width + 'px',
        height: height + 'px',
      }}
    >
      <div className={s.top} style={{ color }}>
        <div
          className={s.cardTitle}
          style={{
            fontSize: titleSize + 'px',
            lineHeight: titleSize + 'px',
            color,
          }}
        >
          {cardTitle}
        </div>
        {companyName && (
          <div
            className={s.companyName}
            style={{
              fontSize: companyNameSize + 'px',
              lineHeight: companyNameSize + 'px',
              color,
            }}
          >
            by {companyName}
          </div>
        )}
      </div>
      <div className={s.bottom}>
        <div
          className={s.name}
          style={{
            fontSize: companyNameSize + 'px',
            lineHeight: companyNameSize + 'px',
            color,
          }}
        >
          {name}
        </div>
        <div
          className={s.currency}
          style={{
            fontSize: currencySize + 'px',
            lineHeight: currencySize + 'px',
            color,
          }}>
          {currency}{currencyValue}
        </div>
      </div>
    </div>
  )
}

WalletCard.defaultProps = {
  className: '',
  backgroundColor: '#fff',
  color: '#ff007f',
  width: 300,
  currency: '$',
}

export default WalletCard
