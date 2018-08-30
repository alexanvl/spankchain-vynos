import {WorkerState} from '../worker/WorkerState'
import {Store} from 'redux'
import getCurrentLedgerChannels from './connext/getCurrentLedgerChannels'
import getVirtualChannels from './getVirtualChannels'
import aggregateVCBalances from './aggregateVCBalances'
import getAddress from './getAddress'
import * as actions from '../worker/actions'
import BN = require('bn.js')

export interface DeferredPopulator {
  populate (): Promise<void>
  release(): void
}

export default class ChannelPopulator {
  private connext: any
  private store: Store<WorkerState>
  private awaiter: Promise<void> | null

  constructor (connext: any, store: Store<WorkerState>) {
    this.awaiter = null
    this.connext = connext
    this.store = store
  }

  public async populateDeferred (): Promise<DeferredPopulator> {
    if (this.awaiter) {
      await this.awaiter
      return this.populateDeferred()
    }

    return new Promise<DeferredPopulator>((outerResolve) => {
      this.awaiter = new Promise((resolve, reject) => {
        const populate = () => this.doPopulate()
          .then(() => {
            resolve()
            this.awaiter = null
          })
          .catch((e) => {
            reject(e)
            this.awaiter = null
          })
        outerResolve({
          populate,
          release: () => {
            this.awaiter = null
          }
        })
      })
    })
  }

  public async populate (): Promise<void> {
    if (this.awaiter) {
      return this.awaiter
    }

    this.awaiter = new Promise((resolve, reject) => {
      this.doPopulate()
        .then(() => {
          resolve()
          this.awaiter = null
        })
        .catch((e) => {
          reject(e)
          this.awaiter = null
        })
    })
  }

  private async doPopulate (): Promise<void> {
    const existingChannels = await getCurrentLedgerChannels(this.connext, this.store)

    if (!existingChannels) {
      this.store.dispatch(actions.setChannel(null))
      return
    }

    const existingChannel = existingChannels[0]
    const vcs = await getVirtualChannels(existingChannel.channelId)
    const balanceLedger = new BN(existingChannel.ethBalanceA)
    const balanceTotal = aggregateVCBalances(getAddress(this.store), vcs).add(balanceLedger)
    this.store.dispatch(actions.setChannel({
      ledgerId: existingChannel.channelId,
      balance: balanceTotal.toString(),
      currentVCs: vcs
    }))
  }
}
