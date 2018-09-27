import {AtomicTransaction} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import Logger from '../Logger'
import requestJson, {postJson} from '../../frame/lib/request'
import withRetries from '../withRetries'

export interface RequestBootyDisbursementResponse {
  id: number
}

export interface BootyDisbursementStatus {
  id: number,
  status: 'NEW' | 'PENDING' | 'COMPLETE' | 'FAILED'
}

export default class RequestBootyTransaction {
  private store: Store<WorkerState>
  private tx: AtomicTransaction<void, void[]>

  constructor (store: Store<WorkerState>, logger: Logger) {
    this.store = store
    this.tx = new AtomicTransaction<void, void[]>(store, logger, 'requestBooty-1', [
      this.requestDisbursement,
      this.pollDisbursementStatus
    ])
  }

  requestDisbursement = async (): Promise<[string, number]> => {
    const addr = this.store.getState().runtime.wallet!.getAddressString()
    const res = await postJson<RequestBootyDisbursementResponse>(`${process.env.HUB_URL}/accounts/${addr}/requestBootyDisbursement`)
    return [addr, res.id]
  }

  pollDisbursementStatus = async (addr: string, id: number): Promise<void> => {
    await withRetries(async () => {
      const res = await requestJson<BootyDisbursementStatus>(`${process.env.HUB_URL}/accounts/${addr}/bootyDisbursements/${id}`)

      if (res.status === 'FAILED') {
        throw new Error('Disbursement failed.')
      }

      if (res.status !== 'COMPLETE') {
        throw new Error('Chainsaw has not caught up yet.')
      }
    })
  }

  async startTransaction (): Promise<any> {
    if (this.tx.isInProgress()) {
      return this.tx.restart()
    }

    return this.tx.start()
  }
}
