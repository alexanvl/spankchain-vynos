import {Store} from 'redux'
import {VynosPurchase} from '../VynosPurchase'
import VynosBuyResponse from '../VynosBuyResponse'
import * as semaphore from 'semaphore'
import * as actions from '../../worker/actions'
import {
  ChannelType,
  IConnext,
  LedgerChannel,
  PaymentObject,
  PaymentType,
  UpdateBalancesResult,
  VirtualChannel
} from '../connext/ConnextTypes'
import {CurrencyType as C, WorkerState} from '../../worker/WorkerState'
import {AtomicTransaction, ensureMethodsHaveNames} from './AtomicTransaction'
import {closeAllVCs} from '../connext/closeAllVCs'
import {INITIAL_DEPOSIT_BEI, INITIAL_DEPOSIT_WEI} from '../constants'
import takeSem from '../takeSem'
import getCurrentLedgerChannels from '../connext/getCurrentLedgerChannels'
import getChannels from '../connext/getChannels'
import Logger from '../Logger'
import Currency, {ICurrency} from '../currency/Currency'
import getVirtualChannels from '../getVirtualChannels'
import BN = require('bn.js')

/**
 * The BuyTransaction handles purchases and tips
 * It executes Buys, restarts halted buys,
 * and automatically opening new virtual channels
 * when no channel exists or the current channel is
 * not large enough.
 *
 * Author: William Cory -- GitHub: roninjin10
 */

type _Args<T> = T extends (...args: infer U) => any ? U : never

/**
 * Returns a function which will accept a currency pair and reutrn the currency
 * of type ``type``.
 */
function typeGetter<T extends C> (type: T): ((p: CurrencyPair) => Currency<T>) & { idx: number } {
  const typeIdx = (
    type == 'WEI' ? 0 :
      type == 'BEI' ? 1 :
        null
  )
  if (typeIdx === null)
    throw new Error('Unexpected purchase currency type (must be ETH or BOOTY): ' + type)
  const res: any = (p: CurrencyPair) => p[typeIdx]
  res.idx = typeIdx
  return res
}

/**
 * Accepts an amount and returns a tuple of [BN, BN], where one BN is 0 and
 * the other is the ``amount``:
 *
 * > amountPair({ type: 'BOOTY', amount: '10' })
 * [0, '10']
 */
function amountPair (amount: ICurrency): [BN, BN] {
  const curType = typeGetter(amount.type)
  return [
    new BN(curType.idx === 1 ? '0' : amount.amount),
    new BN(curType.idx === 0 ? '0' : amount.amount)
  ]
}

/**
 * Accepts an amount and returns a CurrencyPair, where one is 0 and the other
 * is the ``amount``.
 *
 * > currencyPair({ type: 'ETH', amount: '69' })
 * [Currency('ETH', 69), Currency('BOOTY', 0)]
 */
function currencyPair (amount: ICurrency): CurrencyPair {
  const pair = amountPair(amount)
  return [
    new Currency(C.WEI, pair[0]),
    new Currency(C.BEI, pair[1])
  ]
}

export type CurrencyPair = [Currency<C.WEI>, Currency<C.BEI>]

export default class BuyTransaction {
  static DEFAULT_DEPOSIT: CurrencyPair = [
    new Currency(C.WEI, INITIAL_DEPOSIT_WEI.toString()),
    new Currency(C.BEI, INITIAL_DEPOSIT_BEI.toString())
  ]

  private doBuyTransaction: AtomicTransaction<VynosBuyResponse, _Args<BuyTransaction['getExistingChannel']>>
  private connext: IConnext
  private store: Store<WorkerState>
  private sem: semaphore.Semaphore

  constructor (store: Store<WorkerState>, logger: Logger, connext: IConnext, sem: semaphore.Semaphore) {
    ensureMethodsHaveNames(this)
    this.store = store
    this.connext = connext
    this.sem = sem

    const methodOrder = [
      this.getExistingChannel,
      this.getVC,
      this.updateBalance,
      this.updateStore
    ]
    this.doBuyTransaction = new AtomicTransaction(this.store, logger, 'buy', methodOrder)
  }

  public startTransaction = async (purchase: VynosPurchase): Promise<VynosBuyResponse> => {
    return await this.doBuyTransaction.start(purchase)
  }

  public restartTransaction = async (): Promise<VynosBuyResponse | null> => {
    if (!this.isInProgress()) {
      return null
    }
    return takeSem<VynosBuyResponse | null>(
      this.sem,
      () => this.doBuyTransaction.restart()
    )
  }

  public isInProgress = (): boolean => this.doBuyTransaction.isInProgress()

  private getExistingChannel = async (purchase: VynosPurchase): Promise<_Args<BuyTransaction['getVC']>> => {
    const lcState = await this.connext.getChannelByPartyA()
    if (!lcState) {
      throw new Error('A channel must be open')
    }
    return [purchase, lcState]
  }

  private getVC = async (
    purchase: VynosPurchase,
    lc: LedgerChannel
  ): Promise<_Args<BuyTransaction['updateBalance']>> => {
    const recipients = purchase.payments.map(p => p.receiver)
    if (recipients.length != 2) {
      // For now, assume that payments have exactly two recipients: Ingrid and
      // Bob (in that order). In the future we'll need to relax this constraint
      // (to handle LC-only, VC-only, and non-custodial payments), but it's
      // safe to make this assumption for now.
      throw new Error(
        'Incorrect number of purcahse recipients; 2 expected, but got: ' +
        JSON.stringify(recipients)
      )
    }

    // For now, to simplify the camsite, replace the magical value '$$HUB$$'
    // with Ingrid's address (so the camsite doesn't need to know what it is)
    if (recipients[0] == '$$HUB$$') {
      recipients[0] = lc.partyI
      purchase.payments[0].receiver = lc.partyI
    }

    if (recipients[0] != lc.partyI) {
      // As above, this constraint can be relaxed in the future.
      throw new Error(
        `Expected the first recipient to be Ingrid ('${lc.partyI}') ` +
        `but it is not: ${JSON.stringify(recipients)}`
      )
    }

    const vcs = await getVirtualChannels(lc.channelId)
    const existingVC: VirtualChannel | undefined = vcs.find((testVc: VirtualChannel) => recipients[1] == testVc.partyB)

    const purchaseAmountTypes = purchase.payments.map(p => p.amount.type)
    if (purchaseAmountTypes[0] != purchaseAmountTypes[1]) {
      throw new Error('Purchase amount types do not match: ' + JSON.stringify(purchaseAmountTypes))
    }

    const vcAmount = new Currency(purchase.payments[1].amount)
    const useExistingVc = (
      existingVC &&
      vcAmount.compare('lte', [
        existingVC.ethBalanceA,
        existingVC.tokenBalanceA
      ][typeGetter(purchaseAmountTypes[0]).idx])
    )
    const vc = (
      existingVC && useExistingVc ? existingVC
        : await this.createNewVC(recipients[1], vcAmount)
    )

    if (!useExistingVc) {
      lc.tokenBalanceA = new BN(lc.tokenBalanceA).sub(new BN(vc.tokenBalanceA)).toString()
      lc.ethBalanceA = new BN(lc.ethBalanceA).sub(new BN(vc.ethBalanceA)).toString()
    }

    return [purchase, lc, vc]
  }

  private updateBalance = async (
    purchase: VynosPurchase,
    lc: LedgerChannel,
    vc: VirtualChannel
  ): Promise<_Args<BuyTransaction['updateStore']>> => {
    // As noted above, for now the first payment in the purchase is always
    // the LC payment and the second purchase is always the VC payment.

    const makePayment = (chan: LedgerChannel | VirtualChannel, isVc: boolean): PaymentType => {
      const payment = 'openVcs' in chan ? purchase.payments[0] : purchase.payments[1]
      const payments = amountPair(payment.amount)
      const balances = {
        A: [
          new BN(chan.ethBalanceA),
          new BN(chan.tokenBalanceA)
        ],
        B: [
          new BN('openVcs' in chan ? chan.ethBalanceI : chan.ethBalanceB),
          new BN('openVcs' in chan ? chan.tokenBalanceI : chan.tokenBalanceB)
        ]
      }

      console.log(JSON.stringify({
        channelId: chan.channelId,
        balanceA: {
          ethDeposit: balances.A[0].sub(payments[0]).toString(),
          tokenDeposit: balances.A[1].sub(payments[1]).toString()
        },
        balanceB: {
          ethDeposit: balances.B[0].add(payments[0]).toString(),
          tokenDeposit: balances.B[1].add(payments[1]).toString()
        }
      }))

      return {
        channelId: chan.channelId,
        balanceA: {
          ethDeposit: balances.A[0].sub(payments[0]),
          tokenDeposit: balances.A[1].sub(payments[1])
        },
        balanceB: {
          ethDeposit: balances.B[0].add(payments[0]),
          tokenDeposit: balances.B[1].add(payments[1])
        }
      }
    }

    const [lcPayment, vcPayment] = purchase.payments
    const connextUpdate: PaymentObject[] = [
      {
        type: ChannelType.LEDGER,
        meta: {
          receiver: lc.partyI,
          type: lcPayment.type,
          fields: {
            ...lcPayment.fields,
            // Note: for now, copy the purchase fields onto both the payments.
            // Eventually this should be replaced with a first-class "purchase"
            // type which will store the fields... but this will do for now.
            ...purchase.fields
          } as any
        },
        payment: makePayment(lc, false)
      },
      {
        type: ChannelType.VIRTUAL,
        meta: {
          receiver: vc.partyB,
          // Note: for backwards compatibility, allow use the purchase' type to
          // reduce the amount we'll need to change on the hub side. Eventually
          // this type should come entirely from the purchase, though.
          type: purchase.type,
          fields: {
            ...vcPayment.fields,
            // Note: for now, copy the purchase fields onto both the payments.
            // Eventually this should be replaced with a first-class "purchase"
            // type which will store the fields... but this will do for now.
            ...purchase.fields,
            originalType: vcPayment.type
          } as any
        },
        payment: makePayment(vc, true)
      }
    ]

    let res: any

    try {
      res = await this.connext.updateBalances(connextUpdate, vc.partyA)
    } catch (e) {
      console.error('connext.updateBalances failed')
      throw e
    }

    return [
      vc.channelId,
      res
    ]
  }

  private updateStore = async (
    vcId: string,
    result: UpdateBalancesResult
  ): Promise<VynosBuyResponse> => {
    this.store.dispatch(actions.setChannel(
      await getChannels(this.connext, this.store)
    ))

    return {
      channelId: vcId,
      ...result
    }
  }

  // helpers
  private createNewVC = async (
    receiver: string,
    price: Currency
  ): Promise<VirtualChannel> => {
    await closeAllVCs(this.store, this.connext)

    const depositAmounts = await this.getDepositAmounts(price)

    let newVCId: string
    try {
      newVCId = await this.connext.openThread({
        to: receiver,
        deposit: {
          ethDeposit: depositAmounts[0].amountBN,
          tokenDeposit: depositAmounts[1].amountBN
        }
      })
    } catch (e) {
      console.error('connext.openThread with', depositAmounts, 'failed:', e)
      throw e
    }
    try {
      return await this.connext.getThreadById(newVCId)
    } catch (e) {
      console.error('connext.getThreadById failed', e)
      throw e
    }
  }

  private getDepositAmounts = async (price: Currency): Promise<CurrencyPair> => {
    const curType = typeGetter(price.type)
    const available = curType(await this.getAvailableLCBalances())
    const dflt = curType(BuyTransaction.DEFAULT_DEPOSIT)

    if (price.compare('gt', available)) {
      throw new Error(
        `The price cannot be larger than the available LC balance when opening a new channel. ` +
        `Price (${price.type}): ${price.amountBigNumber.div('1e18').toFixed()} ` +
        `availableLcBalance (${price.type}): ${available.amountBigNumber.div('1e18').toFixed()}`
      )
    }

    if (available.compare('lt', dflt))
      return currencyPair(available)

    if (price.compare('gt', dflt))
      return currencyPair(price)

    return currencyPair(dflt)
  }

  private getAvailableLCBalances = async (): Promise<CurrencyPair> => {
    const channels = await getCurrentLedgerChannels(this.connext, this.store)
    if (!channels) {
      throw new Error('Expected to find ledger channels.')
    }

    return [
      new Currency(C.WEI, channels[0].ethBalanceA),
      new Currency(C.BEI, channels[0].tokenBalanceA)
    ]
  }
}
