import { expect } from 'chai'
import withRetries from './withRetries' 

describe('async function withRetries', () => {
  it('withRetries(f, 10, 100) should try to run f 10 times with 100 ms wait before throwing \'Reached maximum retries.\'', async () => {
    let runs = 0
    let isErrorThrown = false
    const f = async (): Promise<void> => {
      throw new Error(`Throw # ${++runs}`)
    }
    try {
      await withRetries(f, 10, 100)
    } catch(e) {
      isErrorThrown = true
      expect(e.message).to.equal('Reached maximum retries.')
    } finally {
      expect(runs).to.equal(10)
      expect(isErrorThrown).to.equal(true)
    }
  })

  it('should stop when f returns', async () => {
    let runs = 0
    const f = async (): Promise<void> => {
      runs++
      if (runs === 5) {
        return
      }
      throw new Error(`Throw # ${runs}`)
    }
    await withRetries(f, 10, 100)
    expect(runs).to.equal(5)
  })
})