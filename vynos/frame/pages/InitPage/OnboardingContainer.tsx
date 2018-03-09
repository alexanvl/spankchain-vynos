import * as React from "react"
import * as classnames from "classnames"
import WalletCard from "../../components/WalletCard/index"
const s = require('./OnboardingContainer.css')

export interface Props {
  children?: any
  totalSteps?: number
  currentStep?: number
}

export default class OnboardingContainer extends React.Component<Props> {

  renderProgressDots() {
    const { totalSteps = 4, currentStep = 0 } = this.props
    const steps = []

    for (let i = 0; i < totalSteps; i++) {
      if (i > 0) {
        steps.push(
          <div
            className={classnames(s.line, {
              [s.activeLine]: i <= currentStep,
            })}
          />
        )
      }

      steps.push(
        <div
          className={classnames(s.dot, {
            [s.activeDot]: i <= currentStep,
          })}
        />
      )
    }

    return (
      <div className={s.progressDots}>
        {steps}
      </div>
    )
  }

  render() {
    return (
      <div className={s.container}>
        <div className={s.header}>
          {this.renderProgressDots()}
          <div className={s.hamburger} />
        </div>
        <WalletCard
          width={275}
          cardTitle="SpankCard"
          companyName="SpankChain"
          name="spanktoshi"
          className={s.funnelWalletCard}
        />
        {this.props.children}
      </div>
    )
  }

}
