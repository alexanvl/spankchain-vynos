import {Store} from 'redux'
import {WorkerState} from '../WorkerState'
import AbstractController from './AbstractController'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import {SendRequest} from '../../lib/rpc/yns'
import Logger from '../../lib/Logger'
import LockStateObserver from '../../lib/LockStateObserver'
import ChannelPopulator from '../../lib/ChannelPopulator'
import BN = require('bn.js')
import Web3 = require('web3')
import {IConnext, PurchaseMetaType, ChannelType} from '../../lib/connext/ConnextTypes'

export default class WithdrawalController extends AbstractController {
  private web3: Web3
  private store: Store<WorkerState>
  private connext: IConnext
  private lso: LockStateObserver
  private populator: ChannelPopulator

  constructor (logger: Logger, connext: IConnext, web3: Web3, store: Store<WorkerState>, lso: LockStateObserver, populator: ChannelPopulator) {
    super(logger)
    this.web3 = web3
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
    const lc = await this.connext.getChannelByPartyA()
    const ethBalanceA = new BN(lc.ethBalanceA).sub(new BN(value))
    const ethBalanceB = new BN(lc.ethBalanceI).add(new BN(value))

    await this.connext.updateBalances([{
      type: ChannelType.LEDGER,
      payment: {
        channelId: lc.channelId,
        balanceA: {ethDeposit: ethBalanceA},
        balanceB: {ethDeposit: ethBalanceB}
      },
      meta: {
        type: PurchaseMetaType.WITHDRAWAL,
        receiver: lc.partyI,
        fields: {
          recipient
        }
      }
    }])
  }
}
