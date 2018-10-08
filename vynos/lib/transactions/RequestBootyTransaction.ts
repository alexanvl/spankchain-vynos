import {AtomicTransaction, ensureMethodsHaveNames} from './AtomicTransaction'
import {WorkerState} from '../../worker/WorkerState'
import {Store} from 'redux'
import Logger from '../Logger'
import requestJson, {postJson} from '../../frame/lib/request'
import withRetries, {DoneFunc} from '../withRetries'
import Web3 = require('web3')
import getTokenBalance from '../web3/getTokenBalance'
import BN = require('bn.js')
import {ZERO} from '../constants'

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
  private web3: Web3

  constructor (store: Store<WorkerState>, web3: Web3, logger: Logger) {
    ensureMethodsHaveNames(this)
    this.store = store
    this.tx = new AtomicTransaction<void, void[]>(store, logger, 'requestBooty-1', [
      this.requestDisbursement,
      this.pollDisbursementStatus,
      this.pollAddress
    ])
    this.web3 = web3
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

  pollAddress = async () => {
    await withRetries(async (done: DoneFunc) => {
      const bootyBalance = await getTokenBalance(this.web3, this.store.getState().runtime.wallet!.getAddressString())

      if (bootyBalance.amountBN.gt(ZERO)) {
        done()
      }
    }, 5)
  }

  async startTransaction (): Promise<any> {
    if (this.tx.isInProgress()) {
      return this.tx.restart()
    }

    return this.tx.start()
  }
}
