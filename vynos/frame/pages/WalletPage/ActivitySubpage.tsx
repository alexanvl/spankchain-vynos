import * as React from 'react'
import * as T from '../../components/Table/index'
import * as classnames from 'classnames'
import {connect} from 'react-redux'
import {FrameState} from '../../redux/FrameState'
import WorkerProxy from '../../WorkerProxy'
import {HistoryItem} from '../../../worker/WorkerState'
import Currency, {CurrencyType} from '../../components/Currency/index'
import * as BigNumber from 'bignumber.js'
import * as moment from 'moment'

const s = require('./styles.css')

export interface StateProps {
  workerProxy: WorkerProxy,
  history: HistoryItem[]
}

export interface ActivitySubpageProps extends StateProps {
}

export interface ActivitySubpageState {
  isLoading: boolean
}

class ActivitySubpage extends React.Component<ActivitySubpageProps, ActivitySubpageState> {
  constructor (props: any) {
    super(props)

    this.state = {
      isLoading: false
    }
  }

  async componentDidMount () {
    this.setState({
      isLoading: true
    })

    await this.props.workerProxy.fetchHistory()

    this.setState({
      isLoading: false
    })
  }

  render () {
    if (this.state.isLoading) {
      return (
        <div className={s.walletActivityWrapper}>
          <div className={s.walletActivityHeaderRow}>
            <div className={s.walletActivityHeader}>Loading...</div>
          </div>
        </div>
      )
    }

    const aggregateAmount = this.props.history.reduce((acc: BigNumber.BigNumber, curr: HistoryItem) => {
      return acc.plus(curr.payment.price)
    }, new BigNumber.BigNumber(0))

    return (
      <div className={s.walletActivityWrapper}>
        <div className={s.walletActivityHeaderRow}>
          <div className={s.walletActivityHeader}>Activity</div>
          <div className={s.walletAmountWrapper}>
            <div className={s.walletAmount}>
              <Currency amount={aggregateAmount} outputType={CurrencyType.USD} showUnit />
            </div>
            <div className={s.walletEqual}>=</div>
            <div className={s.walletConverted}>
              <Currency amount={aggregateAmount} outputType={CurrencyType.ETH} /> ETH
            </div>
          </div>
        </div>
        <T.Table className={s.walletActivityTable}>
          <T.TableHeader className={s.walletActivityTableHeader}>
            <T.TableRow>
              <T.TableHeaderCell
                className={classnames(s.walletActivityHeaderCell, s.walletActivityDate)}>Date</T.TableHeaderCell>
              <T.TableHeaderCell
                className={classnames(s.walletActivityHeaderCell, s.walletActivityTime)}>Time</T.TableHeaderCell>
              <T.TableHeaderCell className={s.walletActivityHeaderCell}>Item</T.TableHeaderCell>
              <T.TableHeaderCell></T.TableHeaderCell>
              <T.TableHeaderCell></T.TableHeaderCell>
            </T.TableRow>
          </T.TableHeader>
          <T.TableBody>
            {this.renderRows()}
          </T.TableBody>
        </T.Table>
      </div>
    )
  }

  renderRows () {
    return this.props.history.map((item: HistoryItem) => {
      const date = new Date(Number(item.createdAt))

      const m = moment(date)
      const mon = m.format('MMM')
      const day = m.format('DD')
      const time = m.format('h:mmA')

      return (
        <T.TableRow key={item.id} className={s.walletActivityEntry}>
          <T.TableCell className={s.walletActivityDate}>
            <div className={s.walletActivityMonth}>{mon}</div>
            <div className={s.walletActivityDay}>{day}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityTime}>
            <div className={s.walletActivityStart}>{time}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityItemDescription}>
            <div className={s.walletActivityItem}>{item.streamName}</div>
            <div className={s.walletActivityDescription}>{item.performerName}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityPrice}>
            <div className={s.walletActivitySubtract}>-</div>
            <div className={s.walletActivitySubtractAmount}>
              <Currency
                amount={new BigNumber.BigNumber(item.payment.price)}
                showUnit
              />
            </div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityAction}>
            <div className={s.walletActivityMore}>...</div>
          </T.TableCell>
        </T.TableRow>
      )
    })
  }
}

function mapStateToProps (state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    history: state.shared.history
  }
}

export default connect(mapStateToProps)(ActivitySubpage)
