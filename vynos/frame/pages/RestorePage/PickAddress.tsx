import * as React from 'react'
import TextBox from '../../components/TextBox/index'
import Button from '../../components/Button/index'
import RestorationCandidate from '../../../lib/RestorationCandidate'
import Currency, {CurrencyType} from '../../components/Currency'
import * as classnames from 'classnames';

const style = require('../../styles/ynos.css')
const finneyInverse = require('../../components/CurrencyIcon/style.css').inverse

export interface PickAddressProps {
  restorationCandidates: RestorationCandidate[]
  onSubmit: (candidate: RestorationCandidate) => void
  goBack: () => void
  isAndroid: boolean
}

export interface PickAddressState {
  message: string
  chosenRestorationCandidate: RestorationCandidate | null
}

export default class PickAddress extends React.Component<PickAddressProps, PickAddressState> {
  state = {
    message: '',
    chosenRestorationCandidate: null
  } as PickAddressState

  render () {
    return (
      <div className={style.content}>
        <div className={style.funnelTitle}>
          Restore Backup Seed
        </div>
        <TextBox className={style.passwordTextBox}>
          {this.state.message || 'Please choose the wallet address you\'d like to restore.'}
        </TextBox>
        {this.renderAddresses()}
        <div className={`${style.funnelFooter} ${this.props.isAndroid ? style.androidFooter : ''}`}>
          <Button
            type="secondary"
            content="Go Back"
            onClick={this.props.goBack}
            isInverse
          />
          <Button
            content={<div className={style.restoreButton} />}
            onClick={this.onSubmit}
            isInverse
          />
        </div>
      </div>
    )
  }

  renderAddresses () {
    return (
      <ol className={style.restorePickAddress}>
        {this.props.restorationCandidates.map((cand: RestorationCandidate) => (
          <li
            key={cand.address}
            className={classnames({
              [style.restorePickAddressChosen]: this.state.chosenRestorationCandidate === cand
            })}
            onClick={() => this.chooseCandidate(cand)}
          >
            {cand.address}
            <div className={style.restorePickAddressBalance}>
              <span>Balance:</span>
              <Currency
                className={style.restorePickAddressCurrency}
                amount={cand.balance}
                inputType={CurrencyType.WEI}
                outputType={CurrencyType.FINNEY}
                unitClassName={`${finneyInverse}`}
                showUnit
              />
            </div>
          </li>
        ))}
      </ol>
    )
  }

  chooseCandidate (chosenRestorationCandidate: RestorationCandidate) {
    this.setState({
      chosenRestorationCandidate
    })
  }

  onSubmit = () => {
    if (!this.state.chosenRestorationCandidate) {
      return this.setState({
        message: 'Please choose a wallet before continuing.'
      })
    }

    this.props.onSubmit(this.state.chosenRestorationCandidate)
  }
}
