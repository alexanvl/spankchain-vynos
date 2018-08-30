import { AtomicTransaction } from './AtomicTransaction'
import { WorkerState, INITIAL_STATE } from '../worker/WorkerState'
import * as redux from 'redux'
import {Store} from 'redux'
import reducers from '../worker/reducers'
import { expect } from 'chai'

describe('AtomicTransaction', () => {

  it('Should pipe methods together on AtomicTransaction.start() saving the state to redux store as it goes and then clear state when finished', async () => {
    const input = 'inputs: '
    let output: string = 'not assigned'
    const f1 = (s: string): string[] => {
      expect(store.getState().persistent.transactions.deposit).to.equal(undefined)
      expect(s).to.equal('inputs: ')
      return [s + '1']
    }
    const f2 = (s: string): string[] => {
      expect(store.getState().persistent.transactions.deposit.nextMethodArgs[0]).to.equal('inputs: 1')
      expect(store.getState().persistent.transactions.deposit.nextMethodIndex).to.equal(1)

      expect(s).to.equal('inputs: 1')
      return [s + '2']
    }
    const f3 = (s: string): string => {
      expect(store.getState().persistent.transactions.deposit.nextMethodArgs[0]).to.equal('inputs: 12')
      expect(store.getState().persistent.transactions.deposit.nextMethodIndex).to.equal(2)
      expect(s).to.equal('inputs: 12')
      output = s + '3'
      return output
    }

    const store = redux.createStore(reducers, INITIAL_STATE) as Store<WorkerState>

    const atomicTransaction = new AtomicTransaction(store, 'deposit', [f1, f2, f3])

    await atomicTransaction.start(input)
    expect(output).to.equal('inputs: 123')

    expect(store.getState().persistent.transactions.deposit).to.equal(undefined)
  })

  it ('Should clear state if an error is thrown in the middle of the transaction', async () => {
    const f1 = (): string => 'this should be cleared'
    const f2 = (message: string): string => message
    const f3 = () => {
      throw new Error('this error should exit the transaction and then clear state')
    }

    const store  = redux.createStore(reducers, INITIAL_STATE) as Store<WorkerState>

    const atomicTransaction = new AtomicTransaction(store, 'deposit', [f1,f2,f3])

    try {
      await atomicTransaction.start()
    } catch(e) {
      return expect(store.getState().persistent.transactions.deposit).to.equal(undefined)
    }
    throw new Error('an error should have been thrown in atomicTransaction')
  })

  it ('AtomicTransaction.restart() should start from where it left off', async () => {
    let functionsDidRun = [false, false, false]
    const f1 = (): void => {
      functionsDidRun[0] = true
    }
    const f2 = (a: string): string => {
      expect(a).to.equal('vitalik impress')
      functionsDidRun[1] = true
      return 'vitalik happy'
    }
    const f3 = (a: string): void => {
      functionsDidRun[2] = true
      expect(a).to.equal('vitalik happy')
    }
    const PERSISTED_STATE = {
      ...INITIAL_STATE,
      persistent: {
        ...INITIAL_STATE.persistent,
        transactions: {
          deposit: {
            nextMethodIndex: 1,
            nextMethodArgs: ['vitalik impress']
          }
        }
      }
    }
    const store = redux.createStore(reducers, PERSISTED_STATE as any) as Store<WorkerState>

    const atomicTransaction = new AtomicTransaction(store, 'deposit', [f1, f2, f3])

    await atomicTransaction.restart()
    expect(functionsDidRun[0]).to.equal(false)
    expect(functionsDidRun[1]).to.equal(true)
    expect(functionsDidRun[2]).to.equal(true)
  })

  it ('should run afterAll after every transaction is done', async () => {
    let didRun = 0
    const afterAll = (): void => {
      didRun++
    }

    const store = redux.createStore(reducers, INITIAL_STATE) as Store<WorkerState>

    const atomicTransaction = new AtomicTransaction(store, 'deposit', [() => {}], afterAll)

    await atomicTransaction.start()
    expect(didRun).to.equal(1)
  })

  it ('should run afterAll even when  a function throws an error', async () => {
    let didRun = 0
    const afterAll = (): void => {
      didRun++
    }

    const f = () => {
      throw new Error('afterAll will hopefully run after this')
    }

    const store = redux.createStore(reducers, INITIAL_STATE) as Store<WorkerState>

    const atomicTransaction = new AtomicTransaction(store, 'deposit', [f], afterAll)
    try {
      await atomicTransaction.start()
    } catch(e) {
    }

    expect(didRun).to.equal(1)
  })
})
