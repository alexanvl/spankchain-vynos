import {CurrencyType, WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import {ChannelType, IConnext, LedgerChannel, PurchaseMetaType} from '../connext/ConnextTypes'
import {AtomicTransaction, ensureMethodsHaveNames} from './AtomicTransaction'
import Logger from '../Logger'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import Currency from '../currency/Currency'
import BN = require('bn.js')
import ChannelPopulator from '../ChannelPopulator'
import requestJson from '../../frame/lib/request'
import {HubBootyLoadResponse} from './Exchange'

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

    const limits = await requestJson<HubBootyLoadResponse>(
      `${process.env.HUB_URL}/payments/booty-load-limit/`
    )

    if (limits.bootyLimit === '0') {
      console.log('already at booty limit')
      return
    }

    const b = await this.generateBalances(lc, limits.bootyLimit)

    console.log('swapping balances', b.tokenBalanceA.toString(), b.tokenBalanceI.toString(),
      b.ethBalanceA.toString(), b.ethBalanceI.toString())

    await this.connext.updateBalances([
      {
        type: ChannelType.LEDGER,
        payment: {
          channelId: lc.channelId,
          balanceA: {
            tokenDeposit: new BN(lc.tokenBalanceA),
            ethDeposit: new BN(lc.ethBalanceA),
          },
          balanceB: {
            tokenDeposit: new BN(lc.tokenBalanceI).add(b.purchasedBei),
            ethDeposit: new BN(lc.ethBalanceI)
          }
        },
        meta: {
          type: PurchaseMetaType.EXCHANGE,
          exchangeRate: b.rate.toString(),
          receiver: process.env.INGRID_ADDRESS!,
        }
      },
      {
        type: ChannelType.LEDGER,
        payment: {
          channelId: lc.channelId,
          balanceA: {
            tokenDeposit: b.tokenBalanceA,
            ethDeposit: b.ethBalanceA
          },
          balanceB: {
            tokenDeposit: b.tokenBalanceI,
            ethDeposit: b.ethBalanceI
          }
        },
        meta: {
          type: PurchaseMetaType.EXCHANGE,
          exchangeRate: b.rate.toString(),
          receiver: process.env.INGRID_ADDRESS!
        }
      }
    ])
  }

  private async generateBalances (lc: LedgerChannel, beiLimit: string) {
    const rates = this.store.getState().runtime.exchangeRates!
    const ethBalanace = Currency.WEI(lc.ethBalanceA)
    let payableWei = new CurrencyConvertable(CurrencyType.BEI, beiLimit, () => rates)
      .toWEI()
    if (payableWei.compare('gt', ethBalanace)) {
      payableWei = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, () => rates)
    }

    const purchasedBei = payableWei.toBEI()

    return {
      purchasedBei: purchasedBei.amountBN,
      tokenBalanceA: new BN(lc.tokenBalanceA).add(purchasedBei.amountBN),
      tokenBalanceI: new BN(lc.tokenBalanceI),
      ethBalanceA: new BN(lc.ethBalanceA).sub(payableWei.amountBN),
      ethBalanceI: new BN(lc.ethBalanceI).add(payableWei.amountBN),
      rate: rates.ETH
    }
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
