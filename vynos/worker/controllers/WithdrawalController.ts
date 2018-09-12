import {Store} from 'redux'
import BN = require('bn.js')
import AbstractController from './AbstractController'
import aggregateVCBalances from '../../lib/aggregateVCBalances'
import ChannelPopulator from '../../lib/ChannelPopulator'
import {closeAllVCs} from '../../lib/connext/closeAllVCs'
import Currency from '../../lib/Currency'
import {
  IConnext,
  PurchaseMetaType,
  ChannelType,
  LedgerChannel,
} from '../../lib/connext/ConnextTypes'
import getAddress from '../../lib/getAddress'
import getVirtualChannels from '../../lib/getVirtualChannels'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import Logger from '../../lib/Logger'
import LockStateObserver from '../../lib/LockStateObserver'
import {SendRequest} from '../../lib/rpc/yns'
import {WorkerState} from '../WorkerState'

export default class WithdrawalController extends AbstractController {
  private store: Store<WorkerState>
  private connext: IConnext
  private lso: LockStateObserver
  private populator: ChannelPopulator

  constructor (logger: Logger, connext: IConnext, store: Store<WorkerState>, lso: LockStateObserver, populator: ChannelPopulator) {
    super(logger)
    this.store = store
    this.connext = connext
    this.lso = lso
    this.populator = populator
  }

  public send = async (to: string, value: string): Promise<void> => {
    if (this.lso.isLocked()) {
      throw new Error('Wallet is locked.')
    }

    await this.updateChannel(to, value)
    await this.populator.populate()
  }

  public registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, SendRequest.method, this.send)
  }

  private updateChannel = async (recipient: string, value: string): Promise<void> => {
    const lc: LedgerChannel = await this.connext.getChannelByPartyA()

    const VALUE_WEI = Currency.WEI(value)
    const LC_BALANCE_WEI = Currency.WEI(lc.ethBalanceA)

    if (VALUE_WEI.amountBN.gt(LC_BALANCE_WEI.amountBN)) {
      const vcs = await getVirtualChannels(lc.channelId)

      const VC_BALANCES_WEI = Currency.WEI(
        await aggregateVCBalances(
          getAddress(this.store),
          vcs
        ).toString(10)
      )
      const TOTAL_BALANCE_WEI = Currency.WEI(
        LC_BALANCE_WEI
          .amountBN
          .add(VC_BALANCES_WEI.amountBN)
          .toString(10)
      )


      if (VALUE_WEI.amountBN.gt(TOTAL_BALANCE_WEI.amountBN)) {
        throw new Error(`
          value is higher than aggregrate virtual channel and ledger channel balances
          value in wei: ${VALUE_WEI.getDecimalString(0)}
          lcBalance in wei: ${LC_BALANCE_WEI.getDecimalString(0)}
          vcBalance in wei: ${VC_BALANCES_WEI.getDecimalString(0)}
          total balance in wei: ${TOTAL_BALANCE_WEI.getDecimalString(0)}
          difference between value and total: ${TOTAL_BALANCE_WEI.amountBN.sub(VALUE_WEI.amountBN).toString(10)}
        `)
      }

      await closeAllVCs(this.store, this.connext)
      return this.updateChannel(recipient, value)
    }

    const BALANCE_A_WEI = Currency.ETH(
      LC_BALANCE_WEI
        .amountBN
        .sub(VALUE_WEI.amountBN)
        .toString(10)
    )
    const BALANCE_B_WEI = Currency.ETH(
      new BN(lc.ethBalanceI)
        .add(VALUE_WEI.amountBN)
        .toString(10)
    )

    await this.connext.updateBalances([{
      type: ChannelType.LEDGER,
      payment: {
        channelId: lc.channelId,
        balanceA: {ethDeposit: BALANCE_A_WEI.amountBN},
        balanceB: {ethDeposit: BALANCE_B_WEI.amountBN}
      },
      meta: {
        type: PurchaseMetaType.WITHDRAWAL,
        receiver: lc.partyI,
        fields: {recipient},
      }
    }])
  }
}
