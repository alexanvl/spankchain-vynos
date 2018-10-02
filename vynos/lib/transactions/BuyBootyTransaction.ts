import {CurrencyType, WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import {ChannelType, IConnext, LedgerChannel} from '../connext/ConnextTypes'
import {AtomicTransaction} from './AtomicTransaction'
import Logger from '../Logger'
import {BOOTY, ZERO} from '../constants'
import CurrencyConvertable from '../currency/CurrencyConvertable'
import Currency from '../currency/Currency'
import BN = require('bn.js')

export interface Balances {
  tokenBalanceA: BN
  tokenBalanceI: BN
  ethBalanceA: BN
  ethBalanceI: BN
  rate: string
}

export default class BuyBootyTransaction {
  private store: Store<WorkerState>

  private connext: IConnext

  private tx: AtomicTransaction<void, void[]>

  constructor (store: Store<WorkerState>, connext: IConnext, logger: Logger) {
    this.store = store
    this.connext = connext
    this.tx = new AtomicTransaction<void, void[]>(
      store,
      logger,
      'buyBootyV0',
      [this.prepareSwap, this.executeSwap]
    )
  }

  private prepareSwap = async (): Promise<[LedgerChannel, Balances]> => {
    const lc = await this.connext.getChannelByPartyA()
    if (!lc) {
      throw new Error('An lc is required.')
    }

    const balances = this.generateBalances(lc)

    console.log('swapping balances', balances.tokenBalanceA.toString(), balances.tokenBalanceI.toString(),
      balances.ethBalanceA.toString(), balances.ethBalanceI.toString())

    return [
      lc,
      balances
    ]
  }

  private executeSwap = async (lc: LedgerChannel, balances: Balances): Promise<void> => {
    const {tokenBalanceA, tokenBalanceI, ethBalanceA, ethBalanceI, rate} = balances

    await this.connext.updateBalances([
      {
        type: ChannelType.EXCHANGE,
        payment: {
          channelId: lc.channelId,
          balanceA: {
            tokenDeposit: tokenBalanceA,
            ethDeposit: ethBalanceA
          },
          balanceB: {
            tokenDeposit: tokenBalanceI,
            ethDeposit: ethBalanceI
          }
        },
        meta: {
          exchangeRate: rate.toString(),
          receiver: process.env.INGRID_ADDRESS
        }
      }
    ])
  }

  private generateBalances (lc: LedgerChannel) {
    const rates = this.store.getState().runtime.exchangeRates!
    const ethBalanace = Currency.WEI(lc.ethBalanceA)
    let payableWei = new CurrencyConvertable(CurrencyType.BOOTY, '69', () => rates)
      .toWEI()
    if (payableWei.compare('gt', ethBalanace)) {
      payableWei = new CurrencyConvertable(CurrencyType.WEI, lc.ethBalanceA, () => rates)
    }

    const purchasedBei = payableWei.toBEI()

    return {
      tokenBalanceA: new BN(lc.tokenBalanceA).add(purchasedBei.amountBN),
      tokenBalanceI: ZERO,
      ethBalanceA: new BN(lc.ethBalanceA).sub(payableWei.amountBN),
      ethBalanceI: new BN(lc.ethBalanceI).add(payableWei.amountBN),
      rate: rates.ETH
    }
  }

  async start () {
    if (this.tx.isInProgress()) {
      return this.tx.restart()
    }

    return this.tx.start()
  }
}
