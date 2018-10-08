import {Store} from 'redux'
import {WorkerState} from '../WorkerState'
import ethUtil = require('ethereumjs-util')
import sigUtil = require('eth-sig-util')
import Tx = require('ethereumjs-tx')
import {Buffer} from 'buffer'

const networks = require('../../networks.json')
const DEFAULT_NETWORK = 'ropsten'

export const RPC_URL = networks[process.env.NETWORK_NAME || DEFAULT_NETWORK]
if (!RPC_URL)
  throw new Error('Unknown NETWORK_NAME: ' + process.env.NETWORK_NAME || DEFAULT_NETWORK)

export type ApproveTransactionCallback = (error: any, isApproved?: boolean) => void
export type ApproveSignCallback = (error: any, rawMsgSig?: string) => void

export default class ProviderOptions {
  store: Store<WorkerState>

  constructor (store: Store<WorkerState>) {
    this.store = store
  }

  getAccounts (callback: (err: any, accounts?: Array<string>) => void) {
    const state = this.store.getState()
    const addr = state.runtime.wallet ? state.runtime.wallet.getAddressString() : null
    callback(null, addr ? [addr] : [])
  }

  approveTransactionAlways (txParams: any, callback: ApproveTransactionCallback) {
    callback(null, true)
  }

  signTransaction (rawTx: any, callback: any) {
    throw new Error('wallet is currently disabled')
    const key = this.getPrivateKey()

    if (!key) {
      return callback('Wallet is locked.')
    }

    let tx = new Tx(rawTx)
    tx.sign(key)
    let txHex = '0x' + Buffer.from(tx.serialize()).toString('hex')
    callback(null, txHex)
  }

  signMessageAlways (messageParams: any, callback: ApproveSignCallback) {
    throw new Error('wallet is currently disabled')
    const key = this.getPrivateKey()

    if (!key) {
      return callback('Wallet is locked.')
    }

    const msg = messageParams.data

    const hashBuf = new Buffer(msg.split('x')[1], 'hex')
    const prefix = new Buffer('\x19Ethereum Signed Message:\n')
    const buf = Buffer.concat([
      prefix,
      new Buffer(String(hashBuf.length)),
      hashBuf
    ])

    const data = ethUtil.sha3(buf)
    const msgSig = ethUtil.ecsign(data, key)
    const rawMsgSig = ethUtil.bufferToHex(sigUtil.concatSig(msgSig.v, msgSig.r, msgSig.s))
    callback(null, rawMsgSig)
  }

  approving (): any {
    return {
      static: {
        eth_syncing: false,
        web3_clientVersion: `LiteratePayments/v${1.0}`
      },
      rpcUrl: RPC_URL,
      getAccounts: this.getAccounts.bind(this),
      approveTransaction: this.approveTransactionAlways.bind(this),
      signTransaction: this.signTransaction.bind(this),
      signMessage: this.signMessageAlways.bind(this),
      signPersonalMessage: this.signMessageAlways.bind(this)
    }
  }

  private getPrivateKey (): Buffer | null {
    const state = this.store.getState()
    return state.runtime.wallet ? state.runtime.wallet.getPrivateKey() : null
  }
}
