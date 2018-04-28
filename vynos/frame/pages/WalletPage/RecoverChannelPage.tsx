import * as React from 'react';
import Input from '../../components/Input'
import Button from '../../components/Button/index'
import * as classnames from 'classnames';
import WorkerProxy from '../../WorkerProxy'
import {ChangeEvent} from 'react'
import {connect} from 'react-redux'
import {FrameState} from '../../redux/FrameState'
import {RouterProps, withRouter} from 'react-router'

const r = require('./RecoverChannelPage.css')
const s = require('./styles.css')

export interface RecoverChannelPageState {
  channelId: string
  isLoading: boolean
  errorMessage: string
}

export interface RecoverChannelPageProps extends RouterProps {
  workerProxy: WorkerProxy
}

export class RecoverChannelPage extends React.Component<RecoverChannelPageProps, RecoverChannelPageState> {
  constructor(props: RecoverChannelPageProps) {
    super(props)

    this.state = {
      channelId: '',
      errorMessage: '',
      isLoading: false
    }

    this.onChangeChannelId = this.onChangeChannelId.bind(this)
    this.onClickRecover = this.onClickRecover.bind(this)
    this.onClickBack = this.onClickBack.bind(this)
  }

  onChangeChannelId (e: ChangeEvent<HTMLInputElement>) {
    this.setState({
      channelId: e.target.value
    })
  }

  async onClickRecover () {
    const { channelId } = this.state

    if (!channelId) {
      this.setState({
        errorMessage: 'You must specify a channel ID.'
      })
      return
    }

    if (!channelId.match(/0x[0-9a-f]{64}/i)) {
      this.setState({
        errorMessage: 'Invalid channel ID.'
      })
      return
    }

    this.setState({
      isLoading: true
    })

    try {
      await this.props.workerProxy.recoverChannel(channelId)
    } catch (e) {
      this.setState({
        isLoading: false,
        errorMessage: `Recovery failed: ${e.message}`
      })
      return
    }

    this.setState({
      isLoading: false,
      errorMessage: ''
    })
  }

  onClickBack () {
    this.props.history.push('/wallet')
  }

  render() {
    return (
      <div className={s.walletRow}>
        <div>
          <h1>Recover Channel</h1>
          {this.renderErrorMessage()}
          <p>This page is for advanced users only. Recovery could take up to 4 minutes.</p>
          <div className={s.inputWrapper}>
            <div className={s.inputLabel}>Channel ID</div>
            <Input
              className={classnames(s.input, r.input)}
              placeholder="Channel ID (0x...)"
              onChange={this.onChangeChannelId}
            />
          </div>
          <Button
            content="Go Back"
            type="secondary"
            disabled={this.state.isLoading}
            onClick={this.onClickBack}
            className={r.backButton}
          />
          <Button
            content={this.state.isLoading ? 'Recovering...' : 'Recover'}
            disabled={this.state.isLoading}
            onClick={this.onClickRecover}
          />
        </div>
      </div>
    )
  }

  renderErrorMessage () {
    if (!this.state.errorMessage) {
      return null
    }

    return (
      <div className={s.walletSpankCardError}>
        {this.state.errorMessage}
      </div>
    )
  }
}

function mapStateToProps (state: FrameState) {
  return {
    workerProxy: state.temp.workerProxy
  }
}

export default withRouter(connect(mapStateToProps)(RecoverChannelPage))
