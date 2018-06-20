import {Store} from 'redux'
import {buildSharedState, SharedState, WorkerState} from '../WorkerState'
import * as actions from '../actions'
import Keyring from '../../frame/lib/Keyring'
import {EventEmitter} from 'events'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import { BigNumber } from 'bignumber.js'
import {
  DidStoreMnemonicRequest,
  GenKeyringRequest,
  GetSharedStateRequest,
  InitAccountRequest,
  LockWalletRequest,
  RememberPageRequest,
  RestoreWalletRequest,
  TransactionResolved,
  UnlockWalletRequest,
  RevealPrivateKeyRequest, GenerateRestorationCandidates
} from '../../lib/rpc/yns'
import bip39 =require('bip39')
import hdkey = require('ethereumjs-wallet/hdkey')
import Wallet = require('ethereumjs-wallet')
import Web3 = require('web3')
import RestorationCandidate from '../../lib/RestorationCandidate'

const STATE_UPDATED_EVENT = 'stateUpdated'

/**
 * MetaMask's HD derivation path.
 *
 * See: https://github.com/MetaMask/metamask-extension/blob/a245fb7d22a5fe08c4fc8c2c1c64d406805018a8/app/scripts/keyrings/hd.js#L10
 * @type {string}
 */
const HD_PATH_STRING = `m/44'/60'/0'/0`

const HD_CHILD_KEY_ID = 0

export default class BackgroundController extends AbstractController {
  store: Store<WorkerState>

  events: EventEmitter

  web3: Web3

  constructor (store: Store<WorkerState>) {
    super()
    this.store = store
    this.events = new EventEmitter()
  }

  setWeb3(web3: Web3) {
    this.web3 = web3
  }

  awaitUnlock (fn: Function) {
    const tryCall = () => {
      this.getSharedState().then(sharedState => {
        let isUnlocked = !sharedState.isLocked && sharedState.didInit
        if (isUnlocked) {
          fn()
        } else {
          this.events.once(STATE_UPDATED_EVENT, tryCall)
        }
      })
    }
    tryCall()
  }

  async isLocked (): Promise<boolean> {
    const state = await this.getSharedState()
    return state.isLocked || !state.didInit
  }

  resolveTransaction () {
    this.store.dispatch(actions.setLastUpdateDb(Date.now()))
  }

  rememberPage (path: string) {
    this.store.dispatch(actions.rememberPage(path))
  }

  getSharedState (): Promise<SharedState> {
    return this.getState().then(buildSharedState)
  }

  async getState (): Promise<WorkerState> {
    return this.store.getState()
  }

  genKeyring (password: string): Promise<string> {
    const mnemonic = bip39.generateMnemonic()
    const keyring = this._generateKeyring(mnemonic, true)
    this.store.dispatch(actions.setWallet(keyring.wallet))
    return Keyring.serialize(keyring, password).then(serialized => {
      this.store.dispatch(actions.setKeyring(serialized))
      return mnemonic
    })
  }

  async revealPrivateKey (mnemonic: string): Promise<string> {
    const hdWallet = this._generateKeyring(mnemonic, true)
    const rootWallet = this._generateKeyring(mnemonic, false)
    const walletAddress = await this.getAddressString()

    if (hdWallet.wallet.getAddressString() === walletAddress) {
      return hdWallet.wallet.getPrivateKeyString()
    }

    if (rootWallet.wallet.getAddressString() === walletAddress) {
      return rootWallet.wallet.getPrivateKeyString()
    }

    throw new Error('Wallet address does not match')
  }

  private _generateKeyring (mnemonic: string, hd: boolean): Keyring {
    let rootKey

    // Root key generation was not properly converting the mnemonic
    // to a seed prior to the below if statement being written.
    // Under the hood, bip39 runs the seed through PBKDF2(mnemonic + 'mnemonic' + password)
    // in order to generate a seed key. MetaMask and other Ethereum clients
    // set the password to an empty string.
    if (hd) {
      const seed = bip39.mnemonicToSeed(mnemonic, '')
      rootKey = hdkey.fromMasterSeed(seed)
    } else {
      rootKey = hdkey.fromMasterSeed(mnemonic)
  }

    const key = hd ? rootKey.derivePath(HD_PATH_STRING)
      .deriveChild(HD_CHILD_KEY_ID) : rootKey
    const wallet = key.getWallet()
    const privateKey = wallet.getPrivateKey()
    return new Keyring(privateKey)
  }

  async generateRestorationCandidates (mnemonic: string): Promise<RestorationCandidate[]> {
    const hdKeyring = this._generateKeyring(mnemonic, true)
    const hdAddress = hdKeyring.wallet.getAddressString()
    const hdBalance = await this.balanceFor(hdAddress)
    const rootKeyring = this._generateKeyring(mnemonic, false)
    const rootAddress = rootKeyring.wallet.getAddressString()
    const rootBalance = await this.balanceFor(rootAddress)

    return [
      {
        address: hdAddress,
        balance: hdBalance.toString(),
        isHd: true
      },
      {
        address: rootAddress,
        balance: rootBalance.toString(),
        isHd: false
      }
    ]
  }

  private balanceFor(address: string): Promise<BigNumber> {
    return new Promise((resolve, reject) => this.web3.eth.getBalance(address, (err: Error, res: BigNumber) => {
      return err ? reject(err) : resolve(res)
    }))
  }

  restoreWallet (password: string, mnemonic: string, hd: boolean): Promise<void> {
    const keyring = this._generateKeyring(mnemonic, hd)
    this.store.dispatch(actions.setWallet(keyring.wallet))
    const wallet = keyring.wallet
    return Keyring.serialize(keyring, password).then(serialized => {
      this.store.dispatch(actions.restoreWallet({keyring: serialized, wallet: wallet}))
    })
  }

  getAccounts (): Promise<Array<string>> {
    return this.getWallet().then(wallet => {
      let account = wallet.getAddressString()
      return [account]
    }).catch(() => {
      return []
    })
  }

  getWallet (): Promise<Wallet> {
    return this.getState().then(state => {
      let wallet = state.runtime.wallet
      if (wallet) {
        return Promise.resolve(wallet)
      } else {
        return Promise.reject(new Error('Wallet is not available'))
      }
    })
  }

  getPrivateKey (): Promise<Buffer> {
    return this.getWallet().then(wallet => {
      return wallet.getPrivateKey()
    })
  }

  getAddressString (): Promise<string> {
    return this.getWallet().then(wallet => {
      return wallet.getAddressString()
    })
  }

  async didStoreMnemonic (): Promise<void> {
    this.store.dispatch(actions.setDidStoreMnemonic(true))
  }

  unlockWallet (password: string): Promise<void> {
    return this.getState().then(state => {
      let keyring = state.persistent.keyring
      if (keyring) {
        return Promise.resolve(Keyring.deserialize(keyring, password))
      } else {
        return Promise.reject(new Error('Keyring is not present'))
      }
    }).then((keyring: Keyring) => {
      this.store.dispatch(actions.setWallet(keyring.wallet))
    })
  }

  lockWallet (): Promise<void> {
    return this.getState().then(() => {
      this.store.dispatch(actions.setWallet(undefined))
    })
  }

  didChangeSharedState (fn: (state: SharedState) => void) {
    this.store.subscribe(() => {
      this.events.emit(STATE_UPDATED_EVENT)
      this.getSharedState().then(sharedState => {
        fn(sharedState)
      })
    })
  }

  registerHandlers (server: JsonRpcServer) {
    this.registerHandler(server, GetSharedStateRequest.method, this.getSharedState)
    this.registerHandler(server, GenKeyringRequest.method, this.genKeyring)
    this.registerHandler(server, RestoreWalletRequest.method, this.restoreWallet)
    this.registerHandler(server, DidStoreMnemonicRequest.method, this.didStoreMnemonic)
    this.registerHandler(server, UnlockWalletRequest.method, this.unlockWallet)
    this.registerHandler(server, LockWalletRequest.method, this.lockWallet)
    this.registerHandler(server, InitAccountRequest.method, this.awaitUnlock)
    this.registerHandler(server, RememberPageRequest.method, this.rememberPage)
    this.registerHandler(server, TransactionResolved.method, this.getSharedState)
    this.registerHandler(server, RevealPrivateKeyRequest.method, this.revealPrivateKey)
    this.registerHandler(server, GenerateRestorationCandidates.method, this.generateRestorationCandidates)
  }
}
