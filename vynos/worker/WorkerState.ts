import Wallet from 'ethereumjs-wallet'
import {SerializedPaymentChannel} from 'machinomy/dist/lib/payment_channel'

export interface RuntimeState {
  wallet?: Wallet
  isTransactionPending: number
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthRealm: string
  authorizationRequest: AuthorizationRequestState|null
  isFrameDisplayed: boolean
  branding: BrandingState
  channels: ChannelsState
}

export interface AuthorizationRequestState {
  hubUrl: string
  authRealm: string
}

export interface ChannelsState {
  [hubUrl: string]: SerializedPaymentChannel[]
}

export interface SharedState {
  didInit: boolean
  isLocked: boolean
  isTransactionPending: number
  rememberPath: string
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthRealm: string
  authorizedHubs: AuthorizedHubsState
  authorizationRequest: AuthorizationRequestState|null
  isFrameDisplayed: boolean
  branding: BrandingState
  channels: ChannelsState
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
  isFrameDisplayed: false,
  branding: {
    address: ''
  },
  channels: {}
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
    authorizationRequest: null,
    isFrameDisplayed: false,
    branding: {
      address: ''
    },
    channels: {}
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
    authorizationRequest: state.runtime.authorizationRequest,
    authorizedHubs: state.persistent.authorizedHubs,
    isFrameDisplayed: state.runtime.isFrameDisplayed,
    branding: state.runtime.branding,
    channels: state.runtime.channels
  }
}
