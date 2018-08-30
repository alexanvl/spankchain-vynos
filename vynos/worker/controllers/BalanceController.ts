import AbstractController from './AbstractController'
import {LifecycleAware} from './LifecycleAware'
import Logger from '../../lib/Logger'
import Poller from '../../lib/Poller'
import LockStateObserver from '../../lib/LockStateObserver'
import {setBalance} from '../actions'
import {Store} from 'redux'
import SharedStateView from '../SharedStateView'
import Web3 from 'web3'
import {WorkerState} from '../WorkerState'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE} from '../../lib/constants'
import MicropaymentsController from './MicropaymentsController'
import BN = require('bn.js')

export default class BalanceController extends AbstractController implements LifecycleAware {
  private poller: Poller
  private lso: LockStateObserver
  private ssv: SharedStateView
  private store: Store<WorkerState>
  private web3: Web3
  private mpc: MicropaymentsController
  private started = false

  static INTERVAL_LENGTH = 10000

  constructor (
    logger: Logger,
    lso: LockStateObserver,
    ssv: SharedStateView,
    store: Store<WorkerState>,
    web3: Web3,
    mpc: MicropaymentsController
  ) {
    super(logger)
    this.poller = new Poller(logger)

    this.lso = lso
    this.lso.addUnlockHandler(() => {
      if (!this.started) {
        return
      }

      setImmediate(() => this.updateBalance()
        .catch((e) => console.error(e))
        .then(() => this.startPolling()))
    })
    this.lso.addLockHandler(() => {
      if (!this.started) {
        return
      }

      this.poller.stop()
    })

    this.ssv = ssv
    this.store = store
    this.web3 = web3
    this.mpc = mpc
  }

  public async start (): Promise<void> {
    this.started = true
  }

  public async stop (): Promise<void> {
    this.started = false
    this.poller.stop()
  }

  private startPolling () {
    if (this.poller.isStarted()) {
      return
    }

    this.poller.start(BalanceController.INTERVAL_LENGTH, this.updateBalance)
  }

  private updateBalance = async () => {
    let address: any
    try {
      address = (await this.ssv.getAccounts())[0]
    } catch (e) {
      console.error('Caught error getting accounts:', e)
    }

    if (!address) {
      return
    }

    const balance = await this.getBalance(address)
    this.store.dispatch(setBalance(balance.toString()))

    if (balance.lt(RESERVE_BALANCE)) {
      return
    }

    if (balance.sub(OPEN_CHANNEL_COST).lt(RESERVE_BALANCE)) {
      return
    }

    const toSweep = balance.sub(RESERVE_BALANCE).sub(OPEN_CHANNEL_COST)
    await this.mpc.deposit(toSweep.toString())
    const newBalance = await this.getBalance(address)
    this.store.dispatch(setBalance(newBalance.toString()))
  }

  private getBalance (address: string): Promise<BN> {
    return new Promise<BN>((resolve, reject) => {
      this.web3.eth.getBalance(address, 'latest', (err: any, balance: number) => {
        if (err) {
          console.error('Failed to get balance:', err)
          reject(err)
        }
        resolve(new BN(balance.toString()))
      })
    })
  }
}
