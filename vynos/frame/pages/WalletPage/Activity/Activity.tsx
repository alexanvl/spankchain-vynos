import * as React from 'react'
import * as T from '../../../components/Table/index'
import * as classnames from 'classnames'
import { connect } from 'react-redux'
import { FrameState } from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import { HistoryItem } from '../../../../worker/WorkerState'
import Currency, { CurrencyType } from '../../../components/Currency/index'
import * as BigNumber from 'bignumber.js'
import * as moment from 'moment'

const s = require('./activity.css')
const baseStyle = require('../styles.css')

export interface StateProps {
  workerProxy: WorkerProxy,
  history: HistoryItem[]
  address: string
}

export interface ActivityProps extends StateProps {
}

export interface ActivityState {
  isLoading: boolean
  detailRows: Set<number>
  error: string
}

interface Group {
  startDate: Date
  endDate?: Date
  groupKey: string
  items: HistoryItem[]
}

type NestedHistory = HistoryItem | HistoryItem[]

type GroupOrHistory = HistoryItem | Group

class Activity extends React.Component<ActivityProps, ActivityState> {
  constructor(props: any) {
    super(props)

    this.state = {
      isLoading: false,
      detailRows: new Set<number>(),
      error: ''
    }
  }

  async componentDidMount() {
    this.setState({
      isLoading: true
    })

    try {
      await this.props.workerProxy.fetchHistory()
    } catch (err) {
      this.setState({
        isLoading: false,
        error: 'Couldn\'t fetch history. Please try again later.'
      })
      return
    }

    this.setState({
      isLoading: false
    })
  }

  toggleDetails(i: number) {
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

  render() {
    const { isLoading, error } = this.state

    const groups = this.props.history.reduce(reduceByTipOrPurchase, [])
      .reduce((acc: GroupOrHistory[], curr: NestedHistory) => {
        if (!Array.isArray(curr)) {
          acc.push(curr)
          return acc
        }

        const tips = curr.reduce(reduceByTipStream, [])
        return acc.concat(tips)
      }, [])

    return (
      <div className={baseStyle.subpageWrapper}>
        <div className={baseStyle.header}>Activity</div>
        <T.Table className={s.walletActivityTable}>
          <T.TableHeader className={s.walletActivityTableHeader}>
            <T.TableRow>
              <T.TableHeaderCell
                className={s.walletActivityHeaderCell}>Date</T.TableHeaderCell>
              <T.TableHeaderCell
                className={classnames(s.walletActivityHeaderCell, s.walletActivityTime)}>Time</T.TableHeaderCell>
              <T.TableHeaderCell className={s.walletActivityHeaderCell}>Item</T.TableHeaderCell>
              <T.TableHeaderCell />
              <T.TableHeaderCell />
            </T.TableRow>
          </T.TableHeader>
          <T.TableBody>
            {
              groups.map((g: GroupOrHistory, i: number) =>
                g.hasOwnProperty('type') ? this.renderWithdrawal(g as HistoryItem) : this.renderGroup(g as Group, i))
            }
          </T.TableBody>
        </T.Table>
      </div>
    )
  }

  renderWithdrawal(item: HistoryItem) {
    const mStart = moment(item.createdAt)

    return (
      <T.TableRow
        key={`${item.payment.token}-info`}
        className={s.walletActivityEntry}
      >
        <T.TableCell>
          <div>
            <div className={s.walletActivityMonth}>{mStart.format('MMM')}</div>
            <div className={s.walletActivityDay}>{mStart.format('DD')}</div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityTime}>
          <div className={s.walletActivityStart}>{mStart.format('h:mmA')}</div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityItemDescription}>
          <div>
            <div className={s.walletActivityItem}>Sent funds</div>
            <div className={s.walletActivityDescription}>To: {item.fields.recipient}</div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityPrice}>
          <div className={classnames(s.walletActivityAmountWrapper, s.walletActivitySignNegative)}>
            <div className={s.walletActivityAmountSign}>-</div>
            <div className={s.walletActivityAmount}>
              <Currency
                amount={item.price}
                outputType={CurrencyType.FINNEY}
                unitClassName={s.activityFinneySign}
                showUnit
              />
            </div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityAction} />
      </T.TableRow>
    )
  }

  renderGroup(group: Group, i: number) {
    const startDate = group.startDate
    const endDate = group.endDate

    const mStart = moment(startDate)
    const mEnd = moment(endDate)

    const toggled = this.state.detailRows.has(i)

    const firstInGroup = group.items[0]

    const total = group.items.reduce((acc: BigNumber.BigNumber, curr: HistoryItem) => {
      if (curr.type === 'TIP' && curr.receiver === this.props.address) {
        return acc.plus(curr.price)
      }

      return acc.minus(curr.price)
    }, new BigNumber(0))

    const isNeg = total.isNegative()

    return [
      <T.TableRow
        key={`${group.groupKey}-info`}
        className={classnames(s.walletActivityEntry, {
          [s.walletActivityEntryToggled]: toggled
        })}
      >
        <T.TableCell >
          <div>
            <div className={s.walletActivityMonth}>{mStart.format('MMM')}</div>
            <div className={s.walletActivityDay}>{mStart.format('DD')}</div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityTime}>
          <div className={s.walletActivityStart}>{mStart.format('h:mmA')} - <br /> {mEnd.format('h:mmA')}</div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityItemDescription}>
          <div>
            <div className={s.walletActivityItem}>{firstInGroup.fields.streamName || firstInGroup.fields.performerName}</div>
            <div className={s.walletActivityDescription}>{firstInGroup.fields.performerName}</div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityPrice}>
          <div
            className={classnames(s.walletActivityAmountWrapper, {
              [s.walletActivityEntryToggled]: toggled,
              [s.walletActivitySignPositive]: !isNeg,
              [s.walletActivitySignNegative]: isNeg,
            })}
          >
            <div className={s.walletActivityAmountSign}>{isNeg ? '-' : '+'}</div>
            <div className={s.walletActivityAmount}>
              <Currency
                amount={total.abs()}
                outputType={CurrencyType.FINNEY}
                unitClassName={s.activityFinneySign}
                showUnit
              />
            </div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityAction}>
          <div className={classnames(s.walletActivityMore, {
            [s.walletActivityMoreToggled]: toggled
          })} onClick={() => this.toggleDetails(i)}>...
          </div>
        </T.TableCell>
      </T.TableRow>,
      toggled ? group.items.map((item: HistoryItem, i: number) => (
        <T.TableRow
          key={`${group.groupKey}-details-${item.payment.token}`}
          className={classnames(s.walletActivityDetails, {
            [s.walletActivityEntryToggled]: toggled,
            [s.walletActivityEntryFirst]: i === 0,
            [s.walletActivityEntryLast]: i === group.items.length - 1
          })}
        >
          <T.TableCell />
          <T.TableCell className={s.walletActivityTime}>
            <div className={s.walletActivityStart}>{moment(new Date(item.createdAt)).format('h:mmA')}</div>
          </T.TableCell>
          <T.TableCell className={s.walletActivityItemDescription}>
            <div className={s.walletActivityItem}>
            {isNeg
              ? item.fields.streamName || item.fields.performerName
              : item.fields.tipperName || item.fields.streamName
            }
            </div>
            {!isNeg && <div className={s.walletActivityDescription}>{item.fields.streamName || item.fields.performerName}</div>}
          </T.TableCell>
          <T.TableCell className={s.walletActivityPrice}>
            <div
              className={classnames(s.walletActivityAmountWrapper, {
                [s.walletActivitySignPositive]: !isNeg,
                [s.walletActivitySignNegative]: isNeg,
              })}
            >
              <div className={s.walletActivityAmountSign}>{isNeg ? '-' : '+'}</div>
              <div className={s.walletActivityAmount}>
                <Currency
                  amount={item.price}
                  outputType={CurrencyType.FINNEY}
                  unitClassName={s.activityFinneySign}
                  showUnit
                />
              </div>
            </div>
          </T.TableCell>
          <T.TableCell />
        </T.TableRow>
      )) : null
    ]
  }
}

function entryFor(item: HistoryItem) {
  return item.type === 'TIP'
    ? [item]
    : item
}

function reduceByTipOrPurchase(acc: NestedHistory[], curr: HistoryItem) {
  if (Number(curr.price) === 0) {
    return acc
  }

  if (!acc.length) {
    acc.push(entryFor(curr))
    return acc
  }

  const last = acc[acc.length - 1]
  const type = curr.type

  if (Array.isArray(last) && type === 'TIP') {
    last.push(curr)
    return acc
  }

  acc.push(entryFor(curr))
  return acc
}

function reduceByTipStream(acc: Group[], curr: HistoryItem, i: number, all: HistoryItem[]) {
  const date = new Date(curr.createdAt)

  const mon = date.getMonth()
  const day = date.getDate()
  const groupKey = `${mon}-${day}-${curr.fields.streamId}`

  if (!acc.length) {
    acc.push({
      startDate: date,
      groupKey,
      items: [curr]
    })

    return acc
  }

  const last = acc[acc.length - 1]

  if (last.groupKey === groupKey) {
    last.items.push(curr)

    if (i === all.length - 1) {
      last.endDate = date
    }

    return acc
  }

  last.endDate = new Date(last.items[last.items.length - 1].createdAt)

  const group = {
    startDate: date,
    groupKey,
    items: [curr]
  } as any

  if (i === all.length - 1) {
    group.endDate = date
  }

  acc.push(group)

  return acc
}

function mapStateToProps(state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    history: state.shared.history,
    address: state.shared.address!,
  }
}

export default connect(mapStateToProps)(Activity)
