import {buildSharedState, SharedState, WorkerState} from './WorkerState'
import {Store} from 'redux'
import Wallet = require('ethereumjs-wallet')

export default class SharedStateView {
  private store: Store<WorkerState>

  constructor (store: Store<WorkerState>) {
    this.store = store
  }

  public async getHubUrl (): Promise<string> {
    const state = await this.getState()
    return state.runtime.currentHubUrl
  }

  public async isLocked (): Promise<boolean> {
    const isUnlocked = await this.isUnlocked()
    return !isUnlocked
  }

  public async isUnlocked (): Promise<boolean> {
    const sharedState = await this.getSharedState()
    return !sharedState.isLocked && sharedState.didInit
  }

  public async getSharedState (): Promise<SharedState> {
    const state = await this.getState()
    return buildSharedState(state)
  }

  public async getAccounts (): Promise<string[]> {
    try {
      const wallet = await this.getWallet()
      return [wallet.getAddressString()]
    } catch (e) {
      return []
    }
  }

  public async getWallet (): Promise<Wallet> {
    const state = await this.getState()
    const wallet = state.runtime.wallet

    if (!wallet) {
      throw new Error('Wallet is unavailable.')
    }

    return wallet
  }

  public getState (): WorkerState {
    return this.store.getState()
  }
}
