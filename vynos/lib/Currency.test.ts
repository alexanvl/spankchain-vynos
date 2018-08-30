import {assert} from 'chai'
import Currency from './Currency'
import {CurrencyType} from '../worker/WorkerState'

describe('Currency', () => {
  it('should return formatted currency', () => {
    const c = new Currency(CurrencyType.USD, 105.70)
    
    assert.equal(c.format({
      decimals: 2,
      withSymbol: true,
      showTrailingZeros: true,
    }), '$105.70')
    
    assert.equal(c.format({
      decimals: 0,
      withSymbol: true,
      showTrailingZeros: false,
    }), '$106')
    
    assert.equal(c.format({}), '105.7')
  })
})