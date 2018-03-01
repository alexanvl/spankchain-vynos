import { Unidirectional } from '@machinomy/contracts'
import { EventEmitter } from 'events';
import ZeroClientProvider = require("web3-provider-engine/zero")
import { ProviderOpts } from 'web3-provider-engine'
import ProviderOptions from './ProviderOptions'
import TransactionService from '../TransactionService'
import { SharedState, WorkerState } from '../WorkerState'
import SharedStateView from '../SharedStateView'
import Web3 = require("web3")
import BigNumber = require('bignumber.js')
import { Store } from 'redux'
import * as actions from '../actions';

const WALLET_BALANCE_UPDATED = "walletBalanceUpdated"

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
    this.providerOpts = providerOpts
    this.transactions = transactions
    this.events = new EventEmitter()
    this.store = store
    this.sharedStateView = sharedStateView
  }

  public async watchWalletBalance() {
    const account = await this.getAccount()

    if (!account) {
      setTimeout(this.watchWalletBalance.bind(this), 1000)
      return;
    }

    const contract = await this.getContract()
    const web3 = await this.getWeb3()
    const events = await contract.allEvents({fromBlock: 0, toBlock: 'latest'});

    events.watch(() => {
      web3.eth.getBalance(account, (err, balance) => {
        const currentBalance = web3.fromWei(balance, 'ether').toString()
        this.store.dispatch(actions.updateWalletBalance(currentBalance))
      })
    })
   }

  private async getAccount() {
    if (this.account) {
      return this.account
    }

    const accounts = await this.sharedStateView.getAccounts()
    this.account = accounts[0]

    return this.account
  }

  private async getWeb3() {
    if (this.web3) {
      return this.web3
    }

    this.web3 = new Web3(ZeroClientProvider(this.providerOpts))

    return this.web3
  }

  private async getContract () {
    if (this.contract) {
      return this.contract
    }

    const account = this.account || await this.getAccount()
    const web3 = this.web3 || await this.getWeb3()

    this.contract = await Unidirectional.contract(web3.currentProvider).deployed()

    return this.contract
  }
}
