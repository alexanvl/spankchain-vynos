import DepositTransaction from './DepositTransaction'
import { WorkerState, INITIAL_STATE } from '../worker/WorkerState'
import * as redux from 'redux'
import {Store} from 'redux'
import reducers from '../worker/reducers'
import { expect } from 'chai'

describe('class DepositTransaction implements TransactionInterface', () => {
  it(`
    after calling setNeedsCollateral(true)
    startTransaction(amount: string) should pass in amount to connext.openChannel to get a ledgerChannelId
    then it should call connext.getChannelByPartyA to ping chainsaw until it returns the ledger channel
    then it should call connext.requestIngridDeposit({lcId, deposit}) 
    then it should call store.dispatach(actions.setChannel({ledgerId, balance, currentVCs}))
  `)

  it(`
    should not call requestIngridDeposit on startTransaction(amount: string) if setNeedsCollateral(true) is never called.
  `)

  it('should eventually call this.store.dispatch(actions.setChannel({ledgerId, balance, currentVCS})', () => {/*
    const depositTransaction = new DepositTransaction(mockStore, mockConnext)
    await depositTransaction.startTransaction(amount)
    expect(this.store.dispatched[0])*/
  })
})