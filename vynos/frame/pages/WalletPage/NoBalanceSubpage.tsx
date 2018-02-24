import * as React from "react";
import CTAInput from '../../components/CTAInput/index'
import * as qr from 'qr-image'
import * as copy from 'copy-to-clipboard'

const s = require("./styles.css");

function renderQR(address: string) {
  let pngBuffer = qr.imageSync(address, {type: 'png', margin: 1}) as Buffer
  let dataURI = 'data:image/png;base64,' + pngBuffer.toString('base64')

  return (
    <img className={s.walletQR} src={dataURI} />
  )
}

const NoBalanceSubpage: React.SFC<any> = (props) => {
  const { address } = props;

  return (
    <div className={s.walletDescriptionWrapper}>
      <div className={s.walletDescriptionHeader}>Not enough funds in your Wallet</div>
      <div className={s.walletDescription}>If you want to tip them titties you have to send Ether to your SpankWallet. See how to do this on Coinbase</div>
      <div className={s.walletAddressWrapper}>
        <CTAInput
          isInverse
          className={s.ctaInput}
          value={address}
          ctaContent={() => (
            <div className={s.ctaContentWrapper} onClick={() => copy(address)}>
              <div className={s.ctaIcon} />
              <span className={s.ctaText}>Copy</span>
            </div>
          )}
        />
      </div>
      <div className={s.walletQRWrapper}>
        <div className={s.walletQRHeader}>Only send Ether (ETH) to this address.</div>
        {renderQR(address)}
      </div>
    </div>
  )
};


export default NoBalanceSubpage;
