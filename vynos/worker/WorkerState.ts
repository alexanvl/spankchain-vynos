import Wallet from 'ethereumjs-wallet'
import {SerializedPaymentChannel} from 'machinomy/dist/lib/payment_channel'
import Payment from 'machinomy/dist/lib/payment'
import BigNumber = require('bignumber.js')

export interface WalletMainState {
  address: string|null
  balance: BigNumber.BigNumber|null
}

export interface WalletState {
  main: WalletMainState
}

export interface RuntimeState {
  wallet?: Wallet
  isTransactionPending: number
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthRealm: string
  currentAuthToken: string
  authorizationRequest: AuthorizationRequestState|null
  isFrameDisplayed: boolean
  forceRedirect?: string
  branding: BrandingState
  channels: ChannelsState
  history: HistoryItem[]
  walletData: WalletState
}

export interface AuthorizationRequestState {
  hubUrl: string
  authRealm: string
}

export interface ChannelsState {
  [hubUrl: string]: SerializedPaymentChannel[]
}

export interface HistoryItem {
  payment: { channelId: string, sender: string, price: string }
  [key: string]: any
}

export interface SharedState {
  didInit: boolean
  isLocked: boolean
  isTransactionPending: number
  rememberPath: string
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthToken: string
  currentAuthRealm: string
  authorizedHubs: AuthorizedHubsState
  authorizationRequest: AuthorizationRequestState|null
  isFrameDisplayed: boolean
  forceRedirect?: string
  branding: BrandingState
  channels: ChannelsState
  history: HistoryItem[]
  walletData: WalletState
}

export interface PersistentState {
  didInit: boolean,
  keyring?: string,
  rememberPath: string
  authorizedHubs: AuthorizedHubsState
}

export interface BrandingState {
  title?: string
  companyName?: string
  username?: string
  backgroundColor?: string
  textColor?: string
  address: string
}

export interface AuthorizedHubsState {
  [hubUrl: string]: true
}

export interface WorkerState {
  persistent: PersistentState,
  runtime: RuntimeState
}

export const INITIAL_SHARED_STATE: SharedState = {
  didInit: false,
  isLocked: true,
  isTransactionPending: 0,
  rememberPath: '/',
  lastUpdateDb: 0,
  authorizedHubs: {},
  authorizationRequest: null,
  currentHubUrl: '',
  currentAuthRealm: '',
  currentAuthToken: '',
  isFrameDisplayed: false,
  branding: {
    address: ''
  },
  channels: {},
  history: [],
  walletData: {
    main: {
      address: null,
      balance: null,
    },
  },
}

export const INITIAL_STATE: WorkerState = {
  persistent: {
    didInit: false,
    rememberPath: '/',
    authorizedHubs: {}
  },
  runtime: {
    isTransactionPending: 0,
    lastUpdateDb: 0,
    currentHubUrl: '',
    currentAuthRealm: '',
    currentAuthToken: '',
    authorizationRequest: null,
    isFrameDisplayed: false,
    forceRedirect: undefined,
    branding: {
      address: ''
    },
    channels: {},
    history: [],
    walletData: {
      main: {
        address: null,
        balance: null,
      },
    },
  },
}

export function buildSharedState(state: WorkerState): SharedState {
  return {
    didInit: state.persistent.didInit,
    isLocked: !state.runtime.wallet,
    isTransactionPending: state.runtime.isTransactionPending,
    rememberPath: state.persistent.rememberPath,
    lastUpdateDb: state.runtime.lastUpdateDb,
    currentHubUrl: state.runtime.currentHubUrl,
    currentAuthRealm: state.runtime.currentAuthRealm,
    currentAuthToken: state.runtime.currentAuthToken,
    authorizationRequest: state.runtime.authorizationRequest,
    authorizedHubs: state.persistent.authorizedHubs,
    isFrameDisplayed: state.runtime.isFrameDisplayed,
    forceRedirect: state.runtime.forceRedirect,
    walletData: state.runtime.walletData,
    branding: state.runtime.branding,
    channels: state.runtime.channels,
    history: state.runtime.history
  }
}
