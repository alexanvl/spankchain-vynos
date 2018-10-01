import {AtomicTransaction} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import Logger from '../Logger'
import requestJson, {postJson} from '../../frame/lib/request'
import withRetries, {DoneFunc} from '../withRetries'

export interface RequestBootyDisbursementResponse {
  id: number
}

export interface BootyDisbursementStatus {
  id: number,
  status: 'NEW' | 'PENDING' | 'CONFIRMED' | 'FAILED'
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
    const res = await postJson<RequestBootyDisbursementResponse>(`${process.env.HUB_URL}/disbursement/address/${addr}/requestBootyDisbursement`)
    return [addr, res.id]
  }

  pollDisbursementStatus = async (addr: string, id: number): Promise<void> => {
    await withRetries(async (done: DoneFunc) => {
      const res = await requestJson<BootyDisbursementStatus>(`${process.env.HUB_URL}/disbursement/address/${addr}/bootyDisbursement/${id}`)

      if (res.status === 'FAILED') {
        throw new Error('Disbursement failed.')
      }

      if (res.status === 'CONFIRMED') {
        done()
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
