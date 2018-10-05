import * as React from 'react'
import {Route, Switch, withRouter} from 'react-router-dom'
import {connect} from 'react-redux'
import {FrameState} from '../redux/FrameState'
import InitPage from './InitPage'
import UnlockPage from './UnlockPage'
import WalletPage from './WalletPage'
import {RouteComponentProps} from 'react-router'
import WorkerProxy from '../WorkerProxy'
import Logger from '../../lib/Logger'
import {MigrationState} from '../../worker/WorkerState'

export interface StateProps {
  isWalletExpected: boolean
  isUnlockExpected: boolean
  isTransactionPending: boolean
  isFrameDisplayed: boolean
  walletAddress: string | null
  forceRedirect?: string
  workerProxy: WorkerProxy
}

export interface RootStateProps extends RouteComponentProps<any>, StateProps {
}

export type RootContainerProps = RootStateProps

export class RootContainer extends React.Component<RootContainerProps, any> {
  componentDidMount () {
    this.determineRoute()
    this.logErrors()
    window.addEventListener('keydown', this.lock)
  }

  componentWillUnmount () {
    window.removeEventListener('keydown', this.lock)
  }

  logErrors() {
    window.onerror = (message, file, line, column, error) => {
      const { walletAddress } = this.props
      const logger = new Logger({
        source: 'frame',
        getAddress: async () => (walletAddress || '')
      })

      logger.logToApi([{
        name: `${logger.source}:logErrors`,
        ts: new Date(),
        data: {
          message: `Runtime error in ${file}:${line}: ${message}`,
          type: 'error',
          stack: (error && error.stack) ? error.stack : `No stack available - ${file}:${line}:${column}`,
        }
      }])
    }
  }

  lock = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.which === 76) {
      this.props.workerProxy.doLock()
    }
  }

  componentWillReceiveProps (nextProps: RootStateProps) {
    if (this.props.isUnlockExpected === nextProps.isUnlockExpected &&
      this.props.isWalletExpected === nextProps.isWalletExpected &&
      this.props.isFrameDisplayed === nextProps.isFrameDisplayed &&
      this.props.forceRedirect === nextProps.forceRedirect) {
      return
    }

    this.determineRoute(nextProps)
  }

  determineRoute (props?: RootStateProps) {
    const p = props || this.props

    if (p.isWalletExpected) {
      if (p.forceRedirect) {
        this.props.history.push(p.forceRedirect)
        return
      }
      this.props.history.push('/wallet')
      return
    }

    if (p.isUnlockExpected) {
      this.props.history.push('/unlock')
      return
    }

    if (!p.isWalletExpected) {
      this.props.history.push('/init')

      return
    }

    if (!p.isFrameDisplayed) {
      this.props.history.push('/wallet')
      return
    }
  }

  render () {
    return (
      <Switch>
        <Switch>
          <Route path="/(wallet|card)" component={WalletPage} />
          <Route exact path="/unlock" render={() => <UnlockPage next="/wallet" />} />
          <Route path="/init" component={InitPage} />
        </Switch>

        <Route path="/" render={() => null} />
      </Switch>
    )
  }
}

function mapStateToProps (state: FrameState): StateProps {
  let workerProxy = state.temp.workerProxy
  return {
    workerProxy,
    isFrameDisplayed: state.shared.isFrameDisplayed,
    forceRedirect: state.shared.forceRedirect,
    isUnlockExpected: (state.shared.didInit && state.shared.isLocked) || (state.shared.didInit && !state.shared.currentAuthToken && !state.temp.initPage.showInitialDeposit),
    isWalletExpected: state.shared.didInit && !state.shared.isLocked && !state.temp.initPage.showInitialDeposit && !!state.shared.currentAuthToken,
    isTransactionPending: state.shared.didInit && state.shared.isTransactionPending !== 0,
    walletAddress: state.shared.address,
  }
}

export default withRouter(
  connect(mapStateToProps)(RootContainer)
)
