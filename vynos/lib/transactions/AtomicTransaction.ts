import {Store} from 'redux'
import * as actions from '../../worker/actions'
import { WorkerState, AtomicTransactionState } from '../../worker/WorkerState'
import Logger from '../Logger'
import getAddress from '../getAddress';

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
 * getThenPostData = new AtomicTransaction<PostDataResponse>(reduxStore, 'getThenPost', [getData, postData])
 *
 * getThenPostData.start('http://example2.com')
 *
 * getThenPostData.restart()
 *
 * Author: William Cory -- GitHub: roninjin10
 */

const noop = () => {}

export function ensureMethodsHaveNames(host: any): void {
  Object.keys(host).forEach(funcName => {
    let func = host[funcName]
    if (typeof func == 'function' && !func.name) {
      Object.defineProperty(func, 'name', { value: funcName });
    }
  })
}

export class AtomicTransaction<T1, T2 extends any[] = any[]> {
  public name: string
  private store: Store<WorkerState>
  private logger: Logger
  private methodOrder: Function[]
  private onStart: Function
  private onRestart: Function
  private afterAll: Function
  private startedStackTrace?: Error

  constructor(
    store: Store<WorkerState>,
    logger: Logger,
    name: string,
    methodOrder: Function[],
    afterAll: Function = noop,
    onStart = noop,
    onRestart = noop
  ) {
    this.name = name
    this.store = store
    this.methodOrder = methodOrder
    this.onStart = onStart
    this.onRestart = onRestart
    this.afterAll = afterAll
    this.logger = logger
  }

  private log(msg: string, ...rest: any[]): void {
    console.log(`tx ${this.name}: ${msg}`, ...rest)
  }

  public start = async (...args: T2): Promise<T1> => {
    this.startedStackTrace = new Error('failing transaction was started from:')
    this.setState({
      nextMethodArgs: args,
      nextMethodIndex: 0
    })
    await this.onStart()
    return await this.doTransaction()
  }

  public restart = async (): Promise<T1|null> => {
    if (!this.isInProgress()) {
      return null
    }
    await this.onRestart()
    return await this.doTransaction()
  }

  public isInProgress = (): boolean => !!this.getState()

  private doTransaction = async () => {
    const {nextMethodArgs, nextMethodIndex} = this.getState()

    let out: T1

    try {
      out = await this.persistAndRun(nextMethodArgs, nextMethodIndex)
    } catch(e) {
      const oldState = this.getState()
      this.removeState()
      this.afterAll()

      console.error('there was an error running an AtomicTransaction', {
        name: this.name,
        state: oldState,
        account: getAddress(this.store),
        e
      })
      console.error(e) // Log the exception so Chrome shows a stack trace
      console.error(this.startedStackTrace)
      throw e
    }

    this.removeState()
    this.afterAll()

    return out
  }

  private persistAndRun = async (nextMethodArgs: any, nextMethodIndex: number): Promise<T1> => {
    const method = this.methodOrder[nextMethodIndex]
    const methodName = method.name
    this.log(`running step ${nextMethodIndex}: ${methodName} with`, nextMethodArgs)

    const startTime = Date.now()
    const logMethodResult = (res: any) => this.logMethodResult({
      index: nextMethodIndex,
      args: nextMethodArgs,
      result: res,
      duration: Date.now() - startTime,
    })
    try {
      nextMethodArgs = await method(...nextMethodArgs)
      logMethodResult(nextMethodArgs)
    } catch (e) {
      logMethodResult({ error: e.toString() })
      throw e
    }

    nextMethodIndex++

    if (nextMethodIndex === this.methodOrder.length) {
      this.log('complete!', nextMethodArgs)
      return nextMethodArgs
    }

    if (!Array.isArray(nextMethodArgs)) {
      nextMethodArgs = [nextMethodArgs]
    }

    this.setState({
      nextMethodIndex,
      nextMethodArgs,
    })
    return await this.persistAndRun(nextMethodArgs, nextMethodIndex)
  }

  private getState = (): AtomicTransactionState => this.store.getState().persistent.transactions[this.name]

  private setState = (newState: AtomicTransactionState): void => {
    this.store.dispatch(actions.setTransactionState({name: this.name, newState}))
  }

  private removeState = (): void => {
    console.log('removing stored transaction', this.name)
    this.store.dispatch(actions.removeTransactionState(this.name))
  }

  private logMethodResult = (opts: any): void => {
    this.logger.logToApi([{
      name: `wallet:tx:${this.name}:${opts.index}`,
      ts: new Date(),
      data: {
        txName: this.name,
        ...opts,
      }
    }]).catch(e => {
      console.error('failed to log transaction state to API:', e)
    })
  }

}
