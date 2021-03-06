import {CurrencyType, WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import {ChannelType, IConnext, LedgerChannel, PurchaseMetaType} from '../connext/ConnextTypes'
import {AtomicTransaction, ensureMethodsHaveNames} from './AtomicTransaction'
import Logger from '../Logger'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import ChannelPopulator from '../ChannelPopulator'
import requestJson from '../../frame/lib/request'
import {HubBootyLoadResponse} from './Exchange'
import {math} from '../../math'
import {PaymentObject} from '../../lib/connext/ConnextTypes'
import {FINNEY, ZERO} from '../constants'
import BN = require('bn.js')

export function calculateExchangePurchase(lc: LedgerChannel, buying: CurrencyConvertable) {
  const payments: PaymentObject[] = []

  const currencies = [
    CurrencyType.WEI,
    CurrencyType.BEI,
  ]

  const buyingIdx = currencies.indexOf(buying.type)
  if (buyingIdx < 0)
    throw new Error(`Exchange currency must be either 'WEI' or 'BEI', not '${buying.type}'`)

  // The amounts of [eth, booty] that will be added/subtraced from A
  const deltas = [
    math.mul(buying.toWEI().amountBN, buyingIdx == 0 ? 1 : -1),
    math.mul(buying.toBEI().amountBN, buyingIdx == 1 ? 1 : -1),
  ]

  const balsA = [
    lc.ethBalanceA,
    lc.tokenBalanceA,
  ].map(math.bn)

  const balsI = [
    lc.ethBalanceI,
    lc.tokenBalanceI,
  ].map(math.bn)

  // If either delta is greater than Ingrid's balance, Ingrid will need to
  // deposit. Calculate that amount here.
  const depositsI = [
    math.min(balsI[0].sub(deltas[0]), 0).abs(),
    math.min(balsI[1].sub(deltas[1]), 0).abs(),
  ]

  // cannot use BN because BN will round any exchange rate under 1 to 0 or 1
  const exchangeRate = buying.toWEI().amountBigNumber.div(buying.toBEI().amountBigNumber).toString()

  if (math.gt(depositsI[0], 0) || math.gt(depositsI[1], 0)) {
    payments.push({
      type: ChannelType.LEDGER,
      payment: {
        channelId: lc.channelId,
        balanceA: {
          ethDeposit: balsA[0],
          tokenDeposit: balsA[1],
        },
        balanceB: {
          ethDeposit: balsI[0].add(depositsI[0]),
          tokenDeposit: balsI[1].add(depositsI[1]),
        }
      },
      meta: {
        type: PurchaseMetaType.EXCHANGE,
        receiver: lc.partyI,
        exchangeRate,
      }
    })
  }

  payments.push({
    type: ChannelType.LEDGER,
    payment: {
      channelId: lc.channelId,
      balanceA: {
        ethDeposit: balsA[0].add(deltas[0]),
        tokenDeposit: balsA[1].add(deltas[1]),
      },
      balanceB: {
        ethDeposit: math.max(balsI[0].sub(deltas[0]), 0),
        tokenDeposit: math.max(balsI[1].sub(deltas[1]), 0),
      }
    },
    meta: {
      type: PurchaseMetaType.EXCHANGE,
      receiver: lc.partyI,
      exchangeRate,
    }
  })

  return {
    payments,
    deltas,
  }
}

/**
 * Buy or sell booty from the hub.
 * The ``amount`` can be either positive or negative.
 */
export async function buySellBooty(
  connext: IConnext,
  lc: LedgerChannel,
  amount: CurrencyConvertable
) {
  if (amount.amountBN.eq(new BN(0))) {
    throw new Error('buySellBooty amount cannot be 0!')
  }

  const exchange = calculateExchangePurchase(lc, amount)
  console.log(
    'swapping', exchange.deltas[0].toString(), 'WEI for',
    exchange.deltas[1].toString(), 'BEI'
  )
  return await connext.updateBalances(exchange.payments)
}


export default class BuyBootyTransaction {
  private store: Store<WorkerState>

  private connext: IConnext

  private tx: AtomicTransaction<void, void[]>

  private chanPopulator: ChannelPopulator

  constructor (store: Store<WorkerState>, connext: IConnext, logger: Logger, chanPopulator: ChannelPopulator) {
    ensureMethodsHaveNames(this)
    this.store = store
    this.connext = connext
    this.tx = new AtomicTransaction<void, void[]>(
      store,
      logger,
      'buyBootyV0',
      [this.prepareAndExecuteSwap, this.populateChannels],
    )
    this.chanPopulator = chanPopulator
  }

  private prepareAndExecuteSwap = async (): Promise<void> => {
    const lc = await this.connext.getChannelByPartyA()
    if (!lc) {
      throw new Error('An lc is required.')
    }

    if (new BN(lc.ethBalanceA).lt(FINNEY)) {
      console.log('No ETH in channel; doing nothing.')
      return
    }

    const rateThunk = () => this.store.getState().runtime.exchangeRates!
    const maxBooty = new CurrencyConvertable(CurrencyType.BOOTY, '69', rateThunk)
    const ownedBooty = new CurrencyConvertable(CurrencyType.BEI, lc.tokenBalanceA, rateThunk).toBOOTY()
    if (ownedBooty.amountBN.gte(maxBooty.amountBN)) {
      console.log('Already have > 69 booty; not buying more.')
      return
    }

    let bootyToBuy
    const buyableBooty = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, rateThunk).toBOOTY()
    if (buyableBooty.amountBN.gte(maxBooty.amountBN)) {
      console.log('Can buy more than booty limit, setting to booty limit')

      if (ownedBooty.amountBN.gt(ZERO)) {
        console.log('Removing owned booty from buy amount')
      }

      bootyToBuy = new CurrencyConvertable(CurrencyType.BOOTY, maxBooty.amountBN.sub(ownedBooty.amountBN), rateThunk)
    } else {
      bootyToBuy = buyableBooty
    }

    await buySellBooty(this.connext, lc, bootyToBuy.toBEI())
  }

  private populateChannels = async (): Promise<void> => {
    return this.chanPopulator.populate()
  }

  async start () {
    if (this.tx.isInProgress()) {
      return this.tx.restart()
    }

    return this.tx.start()
  }
}
