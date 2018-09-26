import {WorkerState} from '../worker/WorkerState'
import {Store} from 'redux'
import * as actions from '../worker/actions'
import {IConnext} from './connext/ConnextTypes'
import getChannels from './connext/getChannels'

export interface DeferredPopulator {
  populate (): Promise<void>
  release(): void
}

export default class ChannelPopulator {
  private connext: IConnext
  private store: Store<WorkerState>
  private awaiter: Promise<void> | null

  constructor (connext: IConnext, store: Store<WorkerState>) {
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

  private doPopulate = async (): Promise<void> => {
    if (this.store.getState().runtime.wallet) {
      this.store.dispatch(actions.setChannel(
        await getChannels(this.connext, this.store)
      ))
    }
  }
}
