import SharedStateView from '../SharedStateView'
import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import {LifecycleAware} from './LifecycleAware'
import {setBalance, setPendingTransaction} from '../actions'
import * as BigNumber from 'bignumber.js'
import {RequestPayload} from '../../lib/Payload'
import {EndFunction} from '../../lib/StreamServer'
import {SendRequest, SendResponse} from '../../lib/rpc/yns'
import NetworkController from './NetworkController'

const utils = require('web3-utils')

export default class WalletController implements LifecycleAware {
  networkController: NetworkController

  store: Store<WorkerState>

  sharedStateView: SharedStateView

  isWatching: boolean = false

  constructor (networkController: NetworkController, store: Store<WorkerState>, sharedStateView: SharedStateView) {
    this.networkController = networkController
    this.store = store
    this.sharedStateView = sharedStateView

    this.handler = this.handler.bind(this)
    this.watchBalance = this.watchBalance.bind(this)
  }

  public async start (): Promise<void> {
    this.isWatching = true
    this.watchBalance()
  }

  public async stop (): Promise<void> {
    this.stopWatchingBalance()
  }

  public async send (to: string, value: string) {
    const from = (await this.sharedStateView.getAccounts())[0]

    const tx = {
      from,
      to,
      value
    }

    const addressError = this.validateAddress(from, to)

    if (addressError) {
      throw new Error(addressError)
    }

    const hash = await new Promise<string>((resolve, reject) => this.networkController.web3.eth.sendTransaction(tx, (err: any, txHash: string) => {
      if (err) {
        return reject(err)
      }

      return resolve(txHash)
    }))

    this.store.dispatch(setPendingTransaction({
      amount: value,
      hash
    }))

    const originalBalance = (await this.sharedStateView.getSharedState()).balance

    const poll = async () => new Promise<null | number>((resolve, reject) => this.networkController.web3.eth.getTransaction(hash, (err: any, res: any) => {
      if (err) {
        reject(err)
      }

      if (!res.blockNumber) {
        return setTimeout(() => resolve(null), 1000)
      }

      resolve(res.blockNumber)
    }))

    const maxAttempts = 120
    let attempt = 0

    while (attempt < maxAttempts) {
      const ok = await poll()

      if (ok) {
        await this.awaitBalanceChange(originalBalance)
        this.store.dispatch(setPendingTransaction(null))
        return
      }

      attempt++
    }

    this.store.dispatch(setPendingTransaction(null))
    throw new Error('Transaction timed out.')
  }

  public doSend (message: SendRequest, next: Function, end: EndFunction) {
    const [to, value] = message.params

    this.send(to, value).then(() => {
      const res: SendResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: null
      }

      end(null, res)
    }).catch(end)
  }

  public handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (SendRequest.match(message)) {
      this.doSend(message, next, end)
    } else {
      next()
    }
  }

  private async awaitBalanceChange (originalBalance: string) {
    let newBalance = (await this.sharedStateView.getSharedState()).balance

    return new Promise((resolve) => {
      if (newBalance !== originalBalance) {
        return resolve()
      }

      const off = this.store.subscribe(async () => {
        newBalance = (await this.sharedStateView.getSharedState()).balance

        if (newBalance !== originalBalance) {
          off()
          resolve()
        }
      })
    })
  }

  private async watchBalance () {
    if (!this.isWatching) {
      return
    }

    let address

    try {
      address = (await this.sharedStateView.getAccounts())[0]
    } catch (e) {
      console.error('Caught error getting accounts:', e)
    }

    if (!address) {
      return setTimeout(this.watchBalance, 1000)
    }

    this.networkController.web3.eth.getBalance(address, (err: any, balance: BigNumber.BigNumber) => {
      if (err) {
        console.error('Failed to get balance:', err)
        setTimeout(this.watchBalance, 5000)
      }

      this.store.dispatch(setBalance(balance.toString()))
      setTimeout(this.watchBalance, 5000)
    })
  }

  private stopWatchingBalance () {
    this.isWatching = false
  }

  private validateAddress (currentAddress: string, address: string): string | null {
    if (!address) {
      return 'Address cannot be empty.'
    }

    if (!utils.isAddress(address)) {
      return 'Address is invalid.'
    }

    if (address === currentAddress) {
      return 'Address is the same as your wallet address.'
    }

    return null
  }
}
