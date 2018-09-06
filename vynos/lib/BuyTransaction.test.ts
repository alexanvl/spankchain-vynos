import BuyTransaction from './BuyTransaction'
import { WorkerState, INITIAL_STATE, CurrencyType } from '../worker/WorkerState'
import * as redux from 'redux'
import {Store} from 'redux'
import reducers from '../worker/reducers'
import {expect, assert} from 'chai'
import LockStateObserver from './LockStateObserver'
import * as semaphore from 'semaphore'
import {Meta, PurchaseMetaType, PaymentObject, ChannelType} from './connext/ConnextTypes'
import Connext = require('connext')
import Web3 = require('web3')
import * as sinon from 'sinon'
import Currency from './Currency'
import BN = require('bn.js')
import toFinney from './web3/toFinney';
import VirtualChannel from './connext/VirtualChannel';
require('isomorphic-fetch')


const TWO_FINNEY = new Currency(CurrencyType.WEI, toFinney(2).toString(10))
const address = '0x0000000000000000000000000000000000000000'

const meta: Meta= {
  fields: {
    streamId: '',
    streamName: '',
    peformerId: '',
    peformerName: 'butterbubbles',
  },
  receiver: address,
  type: PurchaseMetaType.TIP
}

describe('BuyTransaction', () => {
  let buyTransaction: BuyTransaction
  let store: Store<WorkerState>
  let lockStateObserver: LockStateObserver
  let sem: semaphore.Semaphore
  let connext: any


  beforeEach(() => {
    store = redux.createStore(reducers, INITIAL_STATE) as Store<WorkerState>
    sem = semaphore(1)
    lockStateObserver = new LockStateObserver(store)

    connext = new Connext({
      web3: new Web3(),
      ingridAddress: address,
      watcherUrl: '',
      ingridUrl: '',
      contractAddress: address,
    })

    buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)
  })

  it('Should throw an error if no LC channel is open', async () => {
    await buyTransaction.startTransaction(TWO_FINNEY, meta)
      .then(() => {
        throw new Error('should have thrown')
      })
      .catch(e => {
        expect(e.message).to.equal('A channel must be open')
      })
  })

  it('should create a new vc if one doesn\'t already exist for default deposit', async () => {
    const s = {
      ...INITIAL_STATE,
      runtime: {
        ...INITIAL_STATE.runtime,
        channel: {
          currentVCs: [],
          balance: toFinney(50).toString(10),
          ledgerId: 'ledgerId',
        },
        wallet: {
          getAddressString: () => '',
        },
      },
    }
    store = redux.createStore(reducers, s) as Store<WorkerState>
    buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)

    let openThreadCalls = 0
    connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
      expect(to).to.equal(meta.receiver)
      expect(ethDeposit.toString(10)).to.equal(BuyTransaction.DEFAULT_DEPOSIT.amountBN.toString(10))
      openThreadCalls++
    }

    connext.closeThreads = async () => {}
    connext.getThreadById = async (): Promise<VirtualChannel> => ({
      state: 1,
      ethBalanceA: BuyTransaction.DEFAULT_DEPOSIT.amountBN.toString(10),
      ethBalanceB: '0',
      channelId: 'channelId',
      partyA: address,
      partyB: address,
      partyI: '',
      subchanAtoI: '',
      subchanBtoI: '',
      nonce: 1,
    })

    ;(global as any).fetch = () => {}
    let stubedFetch: any = sinon.stub(global, 'fetch' as any)
    stubedFetch.resolves({json: () => []})

    connext.getChannelByPartyA = () => ({
      channelId: '1',
      partyA: '',
      partyI: '',
      ethBalanceA: toFinney(50).toString(10),
      ethBalanceI: toFinney(50).toString(10),
    })

    connext.updateBalances = (update: PaymentObject[]) => {
      expect(update.length === 1)
      expect(update[0].payment.balanceA.ethDeposit!.toString(10)).to.equal(toFinney(8).toString(10))
      expect(update[0].payment.balanceB.ethDeposit!.toString(10)).to.equal(toFinney(2).toString(10))
      expect(update[0].meta).to.equal(meta)
      expect(update[0].type).to.equal(ChannelType.VIRTUAL)

      return {
      '0': {
        id: {
          toString: () => ''
        }
      }
      }
    }

    await buyTransaction.startTransaction(TWO_FINNEY, meta)

    expect(store.getState().runtime.channel!.balance).to.equal(toFinney(48).toString(10))

    expect(openThreadCalls).to.equal(1)
  })

  it('should create a new vc if balanceA of currentvc is less than the price', async () => {
    const s = {
      ...INITIAL_STATE,
      runtime: {
        ...INITIAL_STATE.runtime,
        channel: {
          balance: toFinney(50).toString(10),
          currentVCs: [{
            state: 1,
            ethBalanceA: toFinney(1).toString(),
            ethBalanceB: toFinney(1).toString(),
            channelId: '1',
            partyA: address,
            partyB: address,
            partyI: address,
            subchanAtoI: '',
            subchanBtoI: '',
            nonce: 1,
          }] as VirtualChannel[]},
        wallet: {
          getAddressString: () => address,
        },
      },
    }
    store = redux.createStore(reducers, s) as Store<WorkerState>
    buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)

    let openThreadCalls = 0
    connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
      expect(to).to.equal(meta.receiver)
      expect(ethDeposit.toString(10)).to.equal(BuyTransaction.DEFAULT_DEPOSIT.amountBN.toString(10))
      openThreadCalls++
    }

    connext.closeThreads = async () => {}
    connext.getThreadById = async (): Promise<VirtualChannel> => ({
      state: 1,
      ethBalanceA: BuyTransaction.DEFAULT_DEPOSIT.amountBN.toString(10),
      ethBalanceB: '0',
      channelId: 'channelId',
      partyA: address,
      partyB: address,
      partyI: '',
      subchanAtoI: '',
      subchanBtoI: '',
      nonce: 1,
    })

    ;(global as any).fetch = () => {}
    let stubedFetch: any = sinon.stub(global, 'fetch' as any)
    stubedFetch.resolves({json: () => []})

    connext.getChannelByPartyA = () => ({
      channelId: '1',
      partyA: '',
      partyI: '',
      ethBalanceA: toFinney(50).toString(10),
      ethBalanceI: toFinney(50).toString(10),
    })

    connext.updateBalances = (update: PaymentObject[]) => {
      expect(update.length === 1)
      expect(update[0].payment.balanceA.ethDeposit!.toString(10)).to.equal(toFinney(8).toString(10))
      expect(update[0].payment.balanceB.ethDeposit!.toString(10)).to.equal(toFinney(2).toString(10))
      expect(update[0].meta).to.equal(meta)
      expect(update[0].type).to.equal(ChannelType.VIRTUAL)

      return {
      '0': {
        id: {
          toString: () => ''
        }
      }
      }
    }

    await buyTransaction.startTransaction(TWO_FINNEY, meta)

    expect(store.getState().runtime.channel!.balance).to.equal(toFinney(48).toString(10))

    expect(openThreadCalls).to.equal(1)
  })

  it('should open VC for total LC balance if LC balance is less than the default deposit', async () => {
    const s = {
      ...INITIAL_STATE,
      runtime: {
        ...INITIAL_STATE.runtime,
        channel: {
          balance: toFinney(5).toString(10),
          currentVCs: [{
          state: 1,
          ethBalanceA: toFinney(1).toString(),
          ethBalanceB: toFinney(1).toString(),
          channelId: '1',
          partyA: address,
          partyB: address,
          partyI: address,
          subchanAtoI: '',
          subchanBtoI: '',
          nonce: 1,
        }] as VirtualChannel[]},
        wallet: {
          getAddressString: () => address,
        },
      },
    }
    store = redux.createStore(reducers, s) as Store<WorkerState>
    buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)

    const LC_BALANCE = toFinney(5).toString(10)

    let openThreadCalls = 0
    connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
      expect(to).to.equal(meta.receiver)
      expect(ethDeposit.toString(10)).to.equal(LC_BALANCE)
      openThreadCalls++
    }

    connext.closeThreads = async () => {}
    connext.getThreadById = async (): Promise<VirtualChannel> => ({
      state: 1,
      ethBalanceA: LC_BALANCE,
      ethBalanceB: '0',
      channelId: 'channelId',
      partyA: address,
      partyB: address,
      partyI: '',
      subchanAtoI: '',
      subchanBtoI: '',
      nonce: 1,
    })

    ;(global as any).fetch = () => {}
    let stubedFetch: any = sinon.stub(global, 'fetch' as any)
    stubedFetch.resolves({json: () => []})

    connext.getChannelByPartyA = () => ({
      channelId: '1',
      partyA: '',
      partyI: '',
      ethBalanceA: LC_BALANCE,
      ethBalanceI: toFinney(50).toString(10),
    })

    connext.updateBalances = (update: PaymentObject[]) => {
      expect(update.length === 1)
      expect(update[0].payment.balanceA.ethDeposit!.toString(10)).to.equal(toFinney(3).toString(10))
      expect(update[0].payment.balanceB.ethDeposit!.toString(10)).to.equal(toFinney(2).toString(10))
      expect(update[0].meta).to.equal(meta)
      expect(update[0].type).to.equal(ChannelType.VIRTUAL)

      return {
      '0': {
        id: {
          toString: () => ''
        }
      }
      }
    }

    await buyTransaction.startTransaction(TWO_FINNEY, meta)

    expect(store.getState().runtime.channel!.balance).to.equal(toFinney(3).toString(10))

    expect(openThreadCalls).to.equal(1)
  })

  it('should open a vc for the buy price if it is larger than the default', async () => {
    const s = {
      ...INITIAL_STATE,
      runtime: {
        ...INITIAL_STATE.runtime,
        channel: {currentVCs: [], balance: toFinney(50).toString(10)},
        wallet: {
          getAddressString: () => '',
        },
      },
    }
    store = redux.createStore(reducers, s) as Store<WorkerState>
    buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)

    const BUY_AMOUNT = new Currency(CurrencyType.WEI, toFinney(20).toString(10))

    let openThreadCalls = 0
    connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
      expect(to).to.equal(meta.receiver)
      expect(ethDeposit.toString(10)).to.equal(BUY_AMOUNT.amountBN.toString(10))
      openThreadCalls++
    }

    connext.closeThreads = async () => {}
    connext.getThreadById = async (): Promise<VirtualChannel> => ({
      state: 1,
      ethBalanceA: BUY_AMOUNT.amountBN.toString(10),
      ethBalanceB: '0',
      channelId: 'channelId',
      partyA: address,
      partyB: address,
      partyI: '',
      subchanAtoI: '',
      subchanBtoI: '',
      nonce: 1,
    })

    ;(global as any).fetch = () => {}
    let stubedFetch: any = sinon.stub(global, 'fetch' as any)
    stubedFetch.resolves({json: () => []})

    connext.getChannelByPartyA = () => ({
      channelId: 'channelId',
      partyA: '',
      partyI: '',
      ethBalanceA: toFinney(50).toString(10),
      ethBalanceI: toFinney(50).toString(10),
    })

    connext.updateBalances = (update: PaymentObject[]) => {
      expect(update.length === 1)
      expect(update[0].payment.balanceA.ethDeposit!.toString(10)).to.equal('0')
      expect(update[0].payment.balanceB.ethDeposit!.toString(10)).to.equal(toFinney(20).toString(10))
      expect(update[0].meta).to.equal(meta)
      expect(update[0].type).to.equal(ChannelType.VIRTUAL)

      return {
      '0': {
        id: {
          toString: () => ''
        }
      }
      }
    }

    await buyTransaction.startTransaction(BUY_AMOUNT, meta)

    expect(store.getState().runtime.channel!.balance).to.equal(toFinney(30).toString(10))

    expect(openThreadCalls).to.equal(1)
  })
})