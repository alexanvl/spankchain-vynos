import * as React from "react"
import {connect} from 'react-redux'
import * as classnames from "classnames"
import WorkerProxy from '../../WorkerProxy'
import {FrameState} from '../../redux/FrameState'
import WalletCard from "../../components/WalletCard/index"
import WalletMiniCard from "../../components/WalletMiniCard/index"
const s = require('./OnboardingContainer.css')

export interface MapStateToProps {
  workerProxy: WorkerProxy
}

export interface OwnProps {
  children?: any
  totalSteps: number
  currentStep: number
}

export type Props = MapStateToProps & OwnProps

export class OnboardingContainer extends React.Component<Props> {

  closeView = () => {
    this.props.workerProxy.toggleFrame(false)
  }

  renderProgressDots() {
    const { totalSteps, currentStep } = this.props
    const steps = []

    for (let i = 0; i < totalSteps; i++) {
      if (i > 0) {
        steps.push(
          <div key={'line' + '-' + i}
            className={classnames(s.line, {
              [s.activeLine]: i <= currentStep,
            })}
          />
        )
      }

      steps.push(
        <div key={'dot' + '-' + i}
          className={classnames(s.dot, {
            [s.activeDot]: i <= currentStep,
          })}
        />
      )
    }

    return (
      <div
        className={s.progressDots}>
          {steps}
      </div>
    )
  }

  render() {
    return (
      <div className={s.container}>
        <div className={s.header}>
          {this.renderProgressDots()}
          <WalletMiniCard
            onClick={this.closeView}
            isLocked
            inverse
            alwaysLarge
          />
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

function mapStateToProps(state: FrameState, ownProps: OwnProps): MapStateToProps {
  return {
    workerProxy: state.temp.workerProxy,
  }
}

export default connect(mapStateToProps)(OnboardingContainer)
