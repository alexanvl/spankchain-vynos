import {expect} from 'chai'
import BigNumber from 'bignumber.js'
import * as redux from 'redux'
import CurrencyConvertable from './CurrencyConvertable'
import {WorkerState, INITIAL_STATE, CurrencyType} from '../../worker/WorkerState'
import reducers from '../../worker/reducers'

const USD = new BigNumber('2e15').toString(10)
const ETH = new BigNumber('1e18').toString(10)
const WEI = new BigNumber('1').toString(10)
const FINNEY = new BigNumber('1e15').toString(10)

describe('CurrencyConvertable', () => {
  let cc: CurrencyConvertable 
  
  const TEST_INITIAL_STATE: WorkerState = {
    ...INITIAL_STATE,
    runtime: {
      ...INITIAL_STATE.runtime,
      exchangeRates: {USD,ETH,WEI,FINNEY}
    }
  }

  const store = redux.createStore(reducers, TEST_INITIAL_STATE)

  it('should convert to a new currency with the CurrencyConvertable.to method', () => {
    const eth = new CurrencyConvertable(CurrencyType.ETH, '100', CurrencyConvertable.getExchangeRatesWorker(store))
    const usd = eth.to(CurrencyType.USD)
    
    expect(usd.amount).to.equal('50000')
    expect(usd.type).to.equal(CurrencyType.USD)
  })

  it('CurrencyHandler.toAll should convert to all currencies', () => {
    const eth = new CurrencyConvertable(CurrencyType.ETH, '100', CurrencyConvertable.getExchangeRatesWorker(store))
    const a = eth.toAll()
    
    expect(a.USD.amount).to.equal(eth.to(CurrencyType.USD).amount)
    expect(a.ETH.amount).to.equal(eth.to(CurrencyType.ETH).amount)
    expect(a.WEI.amount).to.equal(eth.to(CurrencyType.WEI).amount)
    expect(a.FINNEY.amount).to.equal(eth.to(CurrencyType.FINNEY).amount)
  })
})
