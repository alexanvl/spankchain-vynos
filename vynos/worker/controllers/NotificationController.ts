import { Unidirectional } from '@machinomy/contracts'
import { EventEmitter } from 'events';
import ZeroClientProvider = require("web3-provider-engine/zero")
import { ProviderOpts } from 'web3-provider-engine'
import ProviderOptions from './ProviderOptions'
import TransactionService from '../TransactionService'
import { SharedState, WorkerState } from '../WorkerState'
import SharedStateView from '../SharedStateView'
import Web3 = require("web3")
import { Store } from 'redux'
import * as actions from '../actions';

const WALLET_BALANCE_UPDATED = "walletBalanceUpdated'"

export default class NotificationController {
  web3: Web3
  contract: any
  transactions: TransactionService
  account: string
  events: EventEmitter
  store: Store<WorkerState>
  providerOpts: ProviderOpts
  sharedStateView: SharedStateView

  constructor(providerOpts: ProviderOpts, store: Store<WorkerState>, sharedStateView: SharedStateView, transactions: TransactionService) {
    this.transactions = transactions
    this.events = new EventEmitter()
    this.store = store
    this.sharedStateView = sharedStateView
  }

  public async watchWalletBalance() {
    const contract = await this.getContract()
    const events = await contract.allEvents({fromBlock: 0, toBlock: 'latest'});

    events.watch((error:any, result:any) => {
      this.store.dispatch(actions.updateWalletBalance(2))
    })
  }

  private async getContract () {
    if (this.contract) {
      return this.contract
    }

    const accounts = await this.sharedStateView.getAccounts()
    this.account = accounts[0]
    this.web3 = new Web3(ZeroClientProvider(this.providerOpts))
    this.contract = await Unidirectional.contract(this.web3.currentProvider).deployed()
  }
}
