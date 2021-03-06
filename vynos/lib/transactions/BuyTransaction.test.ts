// import deepmerge = require('deepmerge')
// import BuyTransaction from './BuyTransaction'
// import { WorkerState, GET_INITIAL_STATE, CurrencyType } from '../../worker/WorkerState'
// import * as redux from 'redux'
// import {Store} from 'redux'
// import reducers from '../../worker/reducers'
// import {expect, assert} from 'chai'
// import LockStateObserver from '../LockStateObserver'
// import * as semaphore from 'semaphore'
// import {
//   PaymentMetaType,
//   PurchaseMetaType,
//   PaymentObject,
//   VirtualChannel,
//   LedgerChannel,
//   ChannelType,
//   UpdateBalancesResult,
// } from '../connext/ConnextTypes'
// import { VynosPurchase } from '../VynosPurchase'
// import Connext = require('connext')
// import Web3 = require('web3')
// import * as sinon from 'sinon'
// import _BN = require('bn.js')
// import toFinney from '../web3/toFinney';
// require('isomorphic-fetch')
// require('chai').use(require('chai-subset'))
//
// type BN = _BN
// const BN = (x: any) => new _BN(x)
//
// const contractAddress = '0xC000000000000000000000000000000000000000'
// const ingridAddress = '0x1000000000000000000000000000000000000000'
// const aliceAddress = '0xA000000000000000000000000000000000000000'
// const bobAddress = '0xB000000000000000000000000000000000000000'
//
// const FIN = (amt: string | number): string => toFinney(+amt).toString()
// const FINBN = (amt: string | number): BN => BN(FIN(amt))
// const BOOTY = (amt: string | number): string => Web3.utils.toWei(amt.toString())
// const BOOTYBN = (amt: string | number): BN => BN(BOOTY(amt))
//
// const PURCHASE_AMOUNT = BOOTY(6.9)
// const PURCHASE_FEE = BOOTY(0.9)
// const PURCHASE_PRINCIPAL = BOOTY(6)
//
// const mkPurchase = (principal: string = PURCHASE_PRINCIPAL): VynosPurchase => ({
//   fields: {
//     streamId: '',
//     streamName: '',
//     peformerId: '',
//     peformerName: 'butterbubbles',
//   },
//   type: PurchaseMetaType.TIP,
//   payments: [
//     {
//       type: PaymentMetaType.FEE,
//       receiver: ingridAddress,
//       amount: {
//         type: CurrencyType.BOOTY,
//         amount: PURCHASE_FEE,
//       },
//     },
//
//     {
//       type: PaymentMetaType.PRINCIPAL,
//       receiver: bobAddress,
//       amount: {
//         type: CurrencyType.BOOTY,
//         amount: principal,
//       },
//     },
//   ],
// })
//
// const mkVc = (overrides?: Partial<VirtualChannel>): VirtualChannel => ({
//   state: 1,
//   ethBalanceA: '0',
//   ethBalanceB: '0',
//   tokenBalanceA: '0',
//   tokenBalanceB: '0',
//   channelId: '1',
//   partyA: aliceAddress,
//   partyB: bobAddress,
//   partyI: ingridAddress,
//   subchanAtoI: '',
//   subchanBtoI: '',
//   nonce: 1,
//   ...(overrides || {}),
// })
//
// describe('BuyTransaction', () => {
//   let connext: any
//
//   function setupTest(storeState?: any) {
//     const store = redux.createStore(
//       reducers,
//       deepmerge(GET_INITIAL_STATE(), {
//         runtime: {
//           wallet: {
//             getAddressString: () => aliceAddress,
//           },
//         },
//       }, storeState || {})
//     ) as Store<WorkerState>
//     const sem = semaphore(1)
//     const lockStateObserver = new LockStateObserver(store)
//     const mockLogger = { logToApi: () => {} } as any
//     const buyTransaction = new BuyTransaction(store, mockLogger, connext, lockStateObserver, sem)
//
//     return  { store, sem, lockStateObserver, buyTransaction }
//   }
//
//   function assertUpdateBalances(updates: PaymentObject[], expected: any) {
//     if (updates.length != 2)
//       throw new Error('Bad updates length: ' + JSON.stringify(updates))
//
//     let [lc, vc] = updates
//     if (lc === undefined)
//       return
//
//     const actual = {
//       lc: {
//         a: lc.payment.balanceA.tokenDeposit!.toString(),
//         i: lc.payment.balanceB.tokenDeposit!.toString(),
//       },
//       vc: {
//         a: vc.payment.balanceA.tokenDeposit!.toString(),
//         b: vc.payment.balanceB.tokenDeposit!.toString(),
//       },
//     }
//     assert.containSubset(actual, expected)
//   }
//
//   beforeEach(() => {
//
//     connext = new Connext({
//       web3: new Web3(),
//       ingridAddress,
//       watcherUrl: '',
//       ingridUrl: '',
//       contractAddress,
//     })
//
//     connext.openThreadCalls = 0
//     connext.expectedThreadOpenAmount = BuyTransaction.DEFAULT_DEPOSIT.amount
//     connext.openThread = (open: any) => {
//       assert.containSubset(open, {
//         to: bobAddress,
//       })
//       assert.equal(open.deposit.tokenDeposit.toString(), connext.expectedThreadOpenAmount)
//       connext.openThreadCalls += 1
//     }
//
//     connext.vcEthBalanceA = '0'
//     connext.vcTokenBalanceA = BuyTransaction.DEFAULT_DEPOSIT.amount
//     connext.getThreadById = async (): Promise<VirtualChannel> => mkVc({
//       ethBalanceA: connext.vcEthBalanceA,
//       tokenBalanceA: connext.vcTokenBalanceA,
//     })
//
//     ;(global as any).fetch = () => {}
//     let stubedFetch: any = sinon.stub(global, 'fetch' as any)
//     stubedFetch.resolves({json: () => []})
//     connext.closeThreads = async () => {}
//
//     connext.lcEthBalanceA = FIN(101)
//     connext.lcEthBalanceB = FIN(102)
//     connext.lcTokenBalanceA = BOOTY(111)
//     connext.lcTokenBalanceA = BOOTY(112)
//     connext.getChannelByPartyA = (): LedgerChannel => ({
//       state: '',
//       channelId: 'channelId',
//       partyA: aliceAddress,
//       partyI: ingridAddress,
//       ethBalanceA: connext.lcEthBalanceA,
//       ethBalanceI: connext.lcEthBalanceB,
//       tokenBalanceA: connext.lcTokenBalanceA,
//       tokenBalanceI: connext.lcTokenBalanceB,
//       nonce: 1,
//       openVcs: 0,
//       vcRootHash: '',
//       openTimeout: 1,
//       updateTimeout: 1,
//     })
//
//     connext.updateBalances = (update: PaymentObject[]): UpdateBalancesResult => {
//       connext.lastBalanceUpdate = update
//
//       return {
//         purchaseId: 'purchaseId',
//         receipts: [
//           { TODO: 1 },
//           { TODO: 2 },
//         ] as any,
//       }
//     }
//   })
//
//   it('Should throw an error if no LC channel is open', async () => {
//     const { buyTransaction } = setupTest()
//     connext.getChannelByPartyA = () => null
//     await buyTransaction.startTransaction(mkPurchase())
//       .then(() => {
//         throw new Error('should have thrown')
//       })
//       .catch((e: any) => {
//         expect(e.message).to.equal('A channel must be open')
//       })
//   })
//
//   it('should create a new vc if one doesn\'t already exist for default deposit', async () => {
//     const { store, buyTransaction } = setupTest()
//     await buyTransaction.startTransaction(mkPurchase())
//
//     assert.equal(connext.openThreadCalls, 1)
//     assertUpdateBalances(connext.lastBalanceUpdate, {
//       lc: {
//         a: BN(connext.lcTokenBalanceA).sub(BN(PURCHASE_FEE)).toString(),
//         i: BN(connext.lcTokenBalanceB).add(BN(PURCHASE_FEE)).toString(),
//       },
//       vc: {
//         a: BuyTransaction.DEFAULT_DEPOSIT.amountBN.sub(BN(PURCHASE_PRINCIPAL)).toString(),
//         b: PURCHASE_PRINCIPAL,
//       },
//     })
//   })
//
//   /*
//   it('should create a new vc if balanceA of currentvc is less than the price', async () => {
//     const s = {
//       ...INITIAL_STATE,
//       runtime: {
//         ...INITIAL_STATE.runtime,
//         channel: {
//           balance: toFinney(50).toString(),
//           currentVCs: [mkVc({
//             ethBalanceA: FIN(1),
//             ethBalanceB: FIN(1),
//           })],
//         },
//         wallet: {
//           getAddressString: () => aliceAddress,
//         },
//       },
//     }
//     store = redux.createStore(reducers, s) as Store<WorkerState>
//     buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)
//
//     let openThreadCalls = 0
//     connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
//       expect(to).to.equal(bobAddress)
//       expect(ethDeposit.toString()).to.equal(BuyTransaction.DEFAULT_DEPOSIT.amountBN.toString())
//       openThreadCalls++
//     }
//
//     connext.closeThreads = async () => {}
//     connext.getThreadById = async (): Promise<VirtualChannel> => mkVc({
//       ethBalanceA: BuyTransaction.DEFAULT_DEPOSIT.amount,
//       tokenBalanceA: BuyTransaction.DEFAULT_DEPOSIT.amount,
//     })
//
//     ;(global as any).fetch = () => {}
//     let stubedFetch: any = sinon.stub(global, 'fetch' as any)
//     stubedFetch.resolves({json: () => []})
//
//     connext.getChannelByPartyA = () => ({
//       channelId: '1',
//       partyA: '',
//       partyI: '',
//       ethBalanceA: toFinney(50).toString(),
//       ethBalanceI: toFinney(50).toString(),
//     })
//
//     connext.updateBalances = (update: PaymentObject[]) => {
//       expect(update.length === 1)
//       expect(update[0].payment.balanceA.ethDeposit!.toString()).to.equal(toFinney(8).toString())
//       expect(update[0].payment.balanceB.ethDeposit!.toString()).to.equal(toFinney(2).toString())
//       expect(update[0].meta).to.equal({ TODO: true })
//       expect(update[0].type).to.equal(ChannelType.VIRTUAL)
//
//       return {
//       '0': {
//         id: {
//           toString: () => ''
//         }
//       }
//       }
//     }
//
//     await buyTransaction.startTransaction(mkPurchase())
//
//     expect(store.getState().runtime.channel!.balanceEth).to.equal(toFinney(48).toString())
//
//     expect(openThreadCalls).to.equal(1)
//   })
//
//   it('should open VC for total LC balance if LC balance is less than the default deposit', async () => {
//     const s = {
//       ...INITIAL_STATE,
//       runtime: {
//         ...INITIAL_STATE.runtime,
//         channel: {
//           balance: toFinney(5).toString(),
//           currentVCs: [mkVc({
//             ethBalanceA: FIN(1),
//             ethBalanceB: FIN(1),
//           })],
//         },
//         wallet: {
//           getAddressString: () => aliceAddress,
//         },
//       },
//     }
//
//     store = redux.createStore(reducers, s) as Store<WorkerState>
//     buyTransaction = new BuyTransaction(store, connext, lockStateObserver, sem)
//
//     const LC_BALANCE = toFinney(5).toString()
//
//     let openThreadCalls = 0
//     connext.openThread = ({to, deposit: {ethDeposit}}: {to: string, deposit: {ethDeposit: BN}}) => {
//       expect(to).to.equal(bobAddress)
//       expect(ethDeposit.toString()).to.equal(LC_BALANCE)
//       openThreadCalls++
//     }
//
//     connext.closeThreads = async () => {}
//     connext.getThreadById = async (): Promise<VirtualChannel> => mkVc({
//       ethBalanceA: LC_BALANCE,
//       tokenBalanceA: LC_BALANCE,
//       partyI: '',
//     })
//
//     ;(global as any).fetch = () => {}
//     let stubedFetch: any = sinon.stub(global, 'fetch' as any)
//     stubedFetch.resolves({json: () => []})
//
//     connext.getChannelByPartyA = () => ({
//       channelId: '1',
//       partyA: '',
//       partyI: '',
//       ethBalanceA: LC_BALANCE,
//       ethBalanceI: toFinney(50).toString(),
//     })
//
//     connext.updateBalances = (update: PaymentObject[]) => {
//       expect(update.length === 1)
//       expect(update[0].payment.balanceA.ethDeposit!.toString()).to.equal(toFinney(3).toString())
//       expect(update[0].payment.balanceB.ethDeposit!.toString()).to.equal(toFinney(2).toString())
//       expect(update[0].meta).to.equal({ TODO: true })
//       expect(update[0].type).to.equal(ChannelType.VIRTUAL)
//
//       return {
//       '0': {
//         id: {
//           toString: () => ''
//         }
//       }
//       }
//     }
//
//     await buyTransaction.startTransaction(mkPurchase())
//
//     expect(store.getState().runtime.channel!.balanceEth).to.equal(toFinney(3).toString())
//
//     expect(openThreadCalls).to.equal(1)
//   })
//   */
//
//   it('should open a vc for the buy price if it is larger than the default', async () => {
//     const initialBalance = BN(PURCHASE_AMOUNT).add(FINBN(100)).toString()
//     const buyAmount = BuyTransaction.DEFAULT_DEPOSIT.amountBN.add(FINBN(10)).toString()
//     const { store, buyTransaction } = setupTest()
//
//     connext.expectedThreadOpenAmount = buyAmount
//     connext.vcEthBalanceA = buyAmount
//
//     await buyTransaction.startTransaction(mkPurchase(buyAmount))
//     assert.equal(connext.openThreadCalls, 1)
//   })
// })
