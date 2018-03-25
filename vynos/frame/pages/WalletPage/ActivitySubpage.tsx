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
  detailRows: Set<number>
}

interface Group {
  startDate: Date
  endDate?: Date
  groupKey: string
  items: HistoryItem[]
}

class ActivitySubpage extends React.Component<ActivitySubpageProps, ActivitySubpageState> {
  constructor (props: any) {
    super(props)

    this.state = {
      isLoading: false,
      detailRows: new Set<number>()
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

  toggleDetails (i: number) {
    const clone = new Set(Array.from(this.state.detailRows))

    if (clone.has(i)) {
      clone.delete(i)
    } else {
      clone.add(i)
    }

    this.setState({
      detailRows: clone
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

    const groups = this.props.history.reduce((acc: Group[], curr: HistoryItem, i: number) => {
      const date = new Date(Number(curr.createdAt))

      const mon = date.getMonth()
      const day = date.getDate()
      const groupKey = `${mon}-${day}-${curr.streamId}`

      if (!acc.length) {
        acc.push({
          startDate: date,
          groupKey,
          items: [ curr ]
        })

        return acc
      }

      const last = acc[acc.length - 1]

      if (last.groupKey === groupKey) {
        last.items.push(curr)

        if (i === this.props.history.length - 1) {
          last.endDate = date
        }

        return acc
      }

      last.endDate = new Date(last.items[last.items.length - 1].createdAt)

      const group = {
        startDate: date,
        groupKey,
        items: [ curr ]
      } as any

      if (i === this.props.history.length - 1) {
        group.endDate = date
      }

      acc.push(group)

      return acc
    }, [])

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
              <T.TableHeaderCell />
              <T.TableHeaderCell />
            </T.TableRow>
          </T.TableHeader>
          <T.TableBody>
            {this.renderRows(groups)}
          </T.TableBody>
        </T.Table>
      </div>
    )
  }

  renderRows (groups: Group[]) {
    return groups.map((group: Group, i: number) => {
      const startDate = group.startDate
      const endDate = group.endDate

      const mStart = moment(startDate)
      const mEnd = moment(endDate)

      const toggled = this.state.detailRows.has(i)

      const total = group.items.reduce((acc: BigNumber.BigNumber, curr: HistoryItem) => {
        return acc.plus(curr.payment.price)
      }, new BigNumber.BigNumber(0))

      return [
        <T.TableRow
          key={`${group.groupKey}-info`}
          className={classnames(s.walletActivityEntry, {
            [s.walletActivityEntryToggled]: toggled
          })}
        >
          <T.TableCell className={s.walletActivityDate}>
            <div className={s.walletActivityMonth}>{mStart.format('MMM')}</div>
            <div className={s.walletActivityDay}>{mStart.format('DD')}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityTime}>
            <div className={s.walletActivityStart}>{mStart.format('h:mmA')} - <br /> {mEnd.format('h:mmA')}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityItemDescription}>
            <div className={s.walletActivityItem}>{group.items[0].streamName}</div>
            <div className={s.walletActivityDescription}>{group.items[0].performerName}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityPrice}>
            <div className={s.walletActivitySubtract}>-</div>
            <div className={s.walletActivitySubtractAmount}>
              <Currency
                amount={total}
                showUnit
              />
            </div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityAction}>
            <div className={classnames(s.walletActivityMore, {
              [s.walletActivityMoreToggled]: toggled
            })} onClick={() => this.toggleDetails(i)}>...</div>
          </T.TableCell>
        </T.TableRow>,
        toggled ? group.items.map((item: HistoryItem, i: number) => (
          <T.TableRow
            key={`${group.groupKey}-details-${item.createdAt}`}
            className={classnames(s.walletActivityDetails, {
              [s.walletActivityEntryToggled]: toggled,
              [s.walletActivityEntryFirst]: i === 0,
              [s.walletActivityEntryLast]: i === group.items.length - 1,
            })}
          >
            <T.TableCell />
            <T.TableCell className={s.walletActivityTime}>
              <div className={s.walletActivityStart}>{moment(new Date(item.createdAt)).format('h:mmA')}</div>
            </T.TableCell>
            <T.TableCell className={s.walletActivityItemDescription}>
              <div className={s.walletActivityItem}>{item.streamName}</div>
            </T.TableCell>
            <T.TableCell className={s.walletActivityPrice}>
              <div className={s.walletActivitySubtract}>-</div>
              <div className={s.walletActivitySubtractAmount}>
                <Currency
                  amount={item.payment.price}
                  showUnit
                />
              </div>
            </T.TableCell>
            <T.TableCell />
          </T.TableRow>
        )) : null
      ]
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
