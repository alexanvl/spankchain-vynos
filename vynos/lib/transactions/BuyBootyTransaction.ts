import {WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import {ChannelType, IConnext, LedgerChannel} from '../connext/ConnextTypes'
import {AtomicTransaction} from './AtomicTransaction'
import {ICurrency} from '../currency/Currency'
import Logger from '../Logger'
import {BOOTY, ZERO} from '../constants'
import BN = require('bn.js')

export interface Balances {
  tokenBalanceA: BN
  tokenBalanceI: BN
  ethBalanceA: BN
  ethBalanceI: BN
  rate: BN
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
        meta: {exchangeRate: rate}
      }
    ])
  }

  private generateBalances (lc: LedgerChannel) {
    const rates = this.store.getState().runtime.exchangeRates!
    let ethToSell = new BN('69').div().mul(new BN(BOOTY.amount))
    if (ethToSell.gt(new BN(lc.ethBalanceA))) {
      ethToSell = new BN(lc.ethBalanceA)
    }

    const bootyToBuy = ethToSell.mul(new BN(rates.ETH)).mul(new BN(BOOTY.amount))
    let iBal = new BN(lc.tokenBalanceI).sub(bootyToBuy)
    if (iBal.lt(ZERO)) {
      iBal = ZERO
    }

    return {
      tokenBalanceA: new BN(lc.tokenBalanceA).add(bootyToBuy),
      tokenBalanceI: iBal,
      ethBalanceA: new BN(lc.ethBalanceA).sub(ethToSell),
      ethBalanceI: new BN(lc.ethBalanceI).add(ethToSell),
      rate: new BN(rates.ETH)
    }
  }

  async start () {
    if (this.tx.isInProgress()) {
      return this.tx.restart()
    }

    return this.tx.start()
  }
}
