import * as React from 'react'
import * as T from '../../../components/Table/index'
import * as classnames from 'classnames'
import {connect} from 'react-redux'
import {FrameState} from '../../../redux/FrameState'
import WorkerProxy from '../../../WorkerProxy'
import {CurrencyType, ExchangeRates, HistoryItem} from '../../../../worker/WorkerState'
import Currency from '../../../components/Currency/index'
import * as BigNumber from 'bignumber.js'
import * as moment from 'moment'
import CurrencyConvertable from '../../../../lib/currency/CurrencyConvertable'

const s = require('./activity.css')
const baseStyle = require('../styles.css')
const unitStyles = require('../../../components/CurrencyIcon/style.css')

export interface StateProps {
  workerProxy: WorkerProxy,
  history: HistoryItem[]
  address: string
  exchangeRates: ExchangeRates
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
  state = {
    isLoading: false,
    detailRows: new Set<number>(),
    error: ''
  } as ActivityState

  async componentDidMount () {
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
    const groups = this.props.history.reduce(reduceByTipOrPurchase, [])
      .reduce((acc: GroupOrHistory[], curr: NestedHistory) => {
        if (!Array.isArray(curr)) {
          acc.push(curr)
          return acc
        }

        const tips = curr.reduce(reduceByTipStream, [])
        return acc.concat(tips)
      }, [])

    let content

    if (!groups.length) {
      content = (
        <T.TableRow>
          <T.TableCell colSpan={5}>
            <p>No history to show. Get tipping!</p>
          </T.TableCell>
        </T.TableRow>
      )
    } else {
      content = groups.map((g: GroupOrHistory, i: number) =>
        g.hasOwnProperty('type') ? this.renderWithdrawal(g as HistoryItem) : this.renderGroup(g as Group, i))
    }

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
            {content}
          </T.TableBody>
        </T.Table>
      </div>
    )
  }

  renderWithdrawal (item: HistoryItem) {
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
                amount={item.amountWei}
                inputType={CurrencyType.WEI}
                outputType={CurrencyType.ETH}
                showUnit
                color='red'
              />
            </div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityAction} />
      </T.TableRow>
    )
  }

  renderGroup (group: Group, i: number) {
    const startDate = group.startDate
    const endDate = group.endDate

    const mStart = moment(startDate)
    const mEnd = moment(endDate)

    const toggled = this.state.detailRows.has(i)

    const firstInGroup = group.items[0]
    let totalWei = new BigNumber(0)
    let totalBooty = new BigNumber(0)

    group.items.forEach((curr: HistoryItem) => {
      const wei = new BigNumber(curr.amountWei)
      const booty = new BigNumber(curr.amountToken)
      const isIncomingTip = curr.type === 'TIP' && curr.receiver === this.props.address

      if (wei.gt(0)) {
        totalWei = totalWei.plus(isIncomingTip ? wei : wei.mul(-1))
      } else {
        totalBooty = totalBooty.plus(isIncomingTip ? booty : booty.mul(-1))
      }
    })

    const converted = new CurrencyConvertable(CurrencyType.WEI, totalWei, () => this.props.exchangeRates)
    const total = converted.toUSD().amountBigNumber.plus(totalBooty)
    const isNeg = total.isNegative()

    return [
      <T.TableRow
        key={`${group.groupKey}-info`}
        className={classnames(s.walletActivityEntry, {
          [s.walletActivityEntryToggled]: toggled
        })}
      >
        <T.TableCell>
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
            <div
              className={s.walletActivityItem}>{firstInGroup.fields.streamName || firstInGroup.fields.performerName}</div>
            <div className={s.walletActivityDescription}>{firstInGroup.fields.performerName}</div>
          </div>
        </T.TableCell>
        <T.TableCell className={s.walletActivityPrice}>
          <div
            className={classnames(s.walletActivityAmountWrapper, {
              [s.walletActivityEntryToggled]: toggled,
              [s.walletActivitySignPositive]: !isNeg,
              [s.walletActivitySignNegative]: isNeg
            })}
          >
            <div className={s.walletActivityAmountSign}>{isNeg ? '-' : '+'}</div>
            <div className={s.walletActivityAmount}>
              {this.renderCurrency({ amountWei: totalWei.toString(), amountToken: totalBooty.toString() }, isNeg)}
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
              {this.renderActivityItem(item, !isNeg)}
            </div>
            {!isNeg &&
            <div className={s.walletActivityDescription}>{item.fields.streamName || item.fields.performerName}</div>}
          </T.TableCell>
          <T.TableCell className={s.walletActivityPrice}>
            <div
              className={classnames(s.walletActivityAmountWrapper, {
                [s.walletActivitySignPositive]: !isNeg,
                [s.walletActivitySignNegative]: isNeg
              })}
            >
              <div className={s.walletActivityAmountSign}>{isNeg ? '-' : '+'}</div>
              <div className={s.walletActivityAmount}>
                {this.renderCurrency(item, isNeg)}
              </div>
            </div>
          </T.TableCell>
          <T.TableCell />
        </T.TableRow>
      )) : null
    ]
  }

  renderCurrency (item: { amountWei: string, amountToken: string }, isNeg: boolean) {
    let amount = item.amountWei === '0' ? item.amountToken : item.amountWei
    const inputType = item.amountWei === '0' ? CurrencyType.BEI : CurrencyType.WEI
    const outputType = item.amountWei === '0' ? CurrencyType.BOOTY : CurrencyType.ETH
    amount = amount.replace(/\D/g, "")
    
    return (
      <Currency
        amount={amount}
        inputType={inputType}
        outputType={outputType}
        color={isNeg? 'red' : 'green'}
        showUnit
      />
    )
  }

  renderActivityItem = (item: HistoryItem, isPerformer: boolean): string => {
    if (!isPerformer || !item.fields.tipperName) {
      return item.fields.streamName || item.fields.performerName!
    }
    if (typeof item.fields.tipperName !== 'string') {
      // some history items were mistakingly set to a object instead of object.username
      return (item.fields.tipperName as any).username
    }
    return item.fields.tipperName
  }

}

function entryFor (item: HistoryItem) {
  return item.type === 'TIP'
    ? [item]
    : item
}

function reduceByTipOrPurchase (acc: NestedHistory[], curr: HistoryItem) {
  if (curr.amountWei === '0' && curr.amountToken === '0') {
    return acc
  }

  if (curr.type === 'FEE') {
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

function reduceByTipStream (acc: Group[], curr: HistoryItem, i: number, all: HistoryItem[]) {
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

function mapStateToProps (state: FrameState): StateProps {
  return {
    workerProxy: state.temp.workerProxy,
    history: state.shared.history,
    address: state.shared.address!,
    exchangeRates: state.shared.exchangeRates!
  }
}

export default connect(mapStateToProps)(Activity)
