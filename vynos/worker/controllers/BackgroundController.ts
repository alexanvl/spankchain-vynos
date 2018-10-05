import {Store} from 'redux'
import {buildSharedState, SharedState, WorkerState} from '../WorkerState'
import * as actions from '../actions'
import Keyring from '../../frame/lib/Keyring'
import {EventEmitter} from 'events'
import JsonRpcServer from '../../lib/messaging/JsonRpcServer'
import AbstractController from './AbstractController'
import BigNumber from 'bignumber.js'
import {
  DidStoreMnemonicRequest,
  GenerateRestorationCandidates,
  GenKeyringRequest,
  GetSharedStateRequest,
  InitAccountRequest,
  LockWalletRequest,
  RememberPageRequest,
  RestoreWalletRequest,
  RevealPrivateKeyRequest,
  TransactionResolved,
  UnlockWalletRequest
} from '../../lib/rpc/yns'
import RestorationCandidate from '../../lib/RestorationCandidate'
import bip39 =require('bip39')
import hdkey = require('ethereumjs-wallet/hdkey')
import Wallet = require('ethereumjs-wallet')
import Web3 = require('web3')
import Logger from '../../lib/Logger'

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

  constructor (store: Store<WorkerState>, web3: Web3, logger: Logger) {
    super(logger)
    this.store = store
    this.events = new EventEmitter()
    this.web3 = web3
  }

  async start (): Promise<void> {
    // noop
  }

  awaitUnlock (fn: Function) {
    const attempt = () => {
      const isUnlocked = !this.isLocked()

      if (isUnlocked) {
        fn()
      } else {
        this.events.once(STATE_UPDATED_EVENT, attempt)
      }
    }

    attempt()
  }

  awaitUnlockP(): Promise<void> {
    return new Promise((resolve) => this.awaitUnlock(resolve))
  }

  async isLocked (): Promise<boolean> {
    const state = await this.getSharedState()
    return state.isLocked || !state.didInit
  }

  rememberPage (path: string) {
    this.store.dispatch(actions.rememberPage(path))
  }

  getSharedState (): SharedState {
    return buildSharedState(this.getState())
  }

  getState (): WorkerState {
    return this.store.getState()
  }

  genKeyring (password: string): Promise<string> {
    const mnemonic = bip39.generateMnemonic()
    const keyring = this._generateKeyring(mnemonic, true)
    this.setWallet(keyring.wallet)
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
    console.log('hdAddress:', hdAddress)
    const hdBalance = await this.balanceFor(hdAddress)
    console.log('hdBalance:', hdBalance.toString())
    const rootKeyring = this._generateKeyring(mnemonic, false)
    const rootAddress = rootKeyring.wallet.getAddressString()
    console.log('rootAddress:', rootAddress)
    const rootBalance = await this.balanceFor(rootAddress)
    console.log('rootBalance:', rootBalance.toString())

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

  private balanceFor (address: string): Promise<BigNumber.BigNumber> {
    return new Promise((resolve, reject) => this.web3!.eth.getBalance(address, 'latest', (err: Error, res: number) => {
      return err ? reject(err) : resolve(new BigNumber(res))
    }))
  }

  restoreWallet (password: string, mnemonic: string, hd: boolean): Promise<void> {
    const keyring = this._generateKeyring(mnemonic, hd)
    this.setWallet(keyring.wallet)
    const wallet = keyring.wallet
    return Keyring.serialize(keyring, password).then(serialized => {
      this.store.dispatch(actions.restoreWallet({keyring: serialized, wallet: wallet}))
    })
  }

  getAccounts (): string[] {
    try {
      const wallet = this.getWallet()
      const addr = wallet.getAddressString()
      return addr ? [addr] : []
    } catch (e) {
      return []
    }
  }

  getWallet (): Wallet {
    const wallet = this.getState().runtime.wallet

    if (!wallet) {
      throw new Error('Wallet is not available.')
    }

    return wallet
  }

  setWallet (wallet?: Wallet): void {
    this.store.dispatch(actions.setWallet(wallet))
  }

  getPrivateKey (): Buffer {
    return this.getWallet().getPrivateKey()
  }

  getAddressString (): string {
    return this.getWallet().getAddressString()
  }

  async didStoreMnemonic (): Promise<void> {
    this.store.dispatch(actions.setDidStoreMnemonic(true))
  }

  async unlockWallet (password: string) {
    const state = this.getState()
      const keyring = state.persistent.keyring

    if (!keyring) {
      throw new Error('Keyring is not present.')
    }

    const deser = await Keyring.deserialize(keyring, password)
    this.setWallet(deser.wallet)
  }

  lockWallet () {
    this.setWallet(undefined)
  }

  didChangeSharedState (fn: (state: SharedState) => void) {
    this.store.subscribe(() => {
      this.events.emit(STATE_UPDATED_EVENT)
      fn(this.getSharedState())
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
