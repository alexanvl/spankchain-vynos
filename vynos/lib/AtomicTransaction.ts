import {Store} from 'redux'
import * as actions from '../worker/actions'
import { WorkerState, AtomicTransactionState } from '../worker/WorkerState'

/**
 * AtomicTransaction handles long running multi step transactions
 * providing an easy way to persist the transaction and pick back up
 * should a user close their browser.
 *
 * @constructor
 * @param {Store<WorkerState>} store - Redux store for persisting state
 * @param {string} name - the namespace this particular Transaction is stored under
 * @param {Function[]} methodOrder - the submethods that make up the transaction in order
 * @param {Function} afterAll - optional - callback that runs after methodOrder functions whether error or not
 * @param {Function} onStart - optional - callback that runs when a new transactions tarts
 * @param {Function} onRestart - optional - callback that runs when a pending transaction restarts
 * @example
 * const getData = (url) => axios.get(url)
 * const postData = (data) => axios.post('http://example.com', data)
 *
 * getThenPostData = new AtomicTransaction(reduxStore, 'getThenPost', [getData, postData])
 *
 * getThenPostData.start('http://example2.com')
 *
 * getThenPostData.restart()
 *
 * Author: William Cory -- GitHub: roninjin10
 */

const noop = () => {}

export interface TransactionInterface {
  startTransaction(...args: any[]): Promise<any>
  restartTransaction(): Promise<any>
}

export class AtomicTransaction {
  public name: string
  private store: Store<WorkerState>
  private methodOrder: Function[]
  private onStart: Function 
  private onRestart: Function
  private afterAll: Function

  constructor(store: Store<WorkerState>, name: string, methodOrder: Function[], afterAll: Function = noop, onStart = noop, onRestart = noop) {
    this.name = name
    this.store = store
    this.methodOrder = methodOrder
    this.onStart = onStart 
    this.onRestart = onRestart
    this.afterAll = afterAll
  }

  public start = async (...args: any[]): Promise<any> => {
    await this.onStart()
    return await this.run(args, 0)
  }

  public restart = async (): Promise<any> => {
    if (!this.isInProgress()) {
      return
    }
    
    const {nextMethodArgs, nextMethodIndex} = this.getState()

    await this.onRestart()
    await this.run(nextMethodArgs, nextMethodIndex) 
  }

  public isInProgress = (): boolean => !!this.getState()

  private run = async (nextMethodArgs: any[], nextMethodIndex: number): Promise<any> => {
    try {
      nextMethodArgs = await this.methodOrder[nextMethodIndex++](...nextMethodArgs)

      if (nextMethodIndex === this.methodOrder.length) {
        this.removeState()
        this.afterAll()
        return nextMethodArgs
      }

      if (!Array.isArray(nextMethodArgs)) {
        nextMethodArgs = [nextMethodArgs]
      }

      this.setState({
        nextMethodIndex,
        nextMethodArgs,
      })

      return await this.run(nextMethodArgs, nextMethodIndex)
    } catch(e) {
      this.removeState()
      this.afterAll()
      throw e
    }
  }

  private getState = (): AtomicTransactionState => this.store.getState().persistent.transactions[this.name]
  
  private setState = (newState: AtomicTransactionState): void => {
    this.store.dispatch(actions.setTransactionState({name: this.name, newState}))
  }

  private removeState = (): void => {
    this.store.dispatch(actions.removeTransactionState(this.name))
  }
}
