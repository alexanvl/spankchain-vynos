import Wallet from 'ethereumjs-wallet'

export interface RuntimeState {
  wallet?: Wallet
  isTransactionPending: number
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthRealm: string
  authorizationRequest: AuthorizationRequestState|null
  isFrameDisplayed: boolean
}

export interface AuthorizationRequestState {
  hubUrl: string
  authRealm: string
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
}

export interface PersistentState {
  didInit: boolean,
  keyring?: string,
  rememberPath: string
  branding: BrandingState
  authorizedHubs: AuthorizedHubsState
}

export interface BrandingState {
  [hubUrl: string]: {
    cardName: string,
    cardImageUrl: string
  }
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
  isFrameDisplayed: false
}

export const INITIAL_STATE: WorkerState = {
  persistent: {
    didInit: false,
    rememberPath: '/',
    branding: {},
    authorizedHubs: {}
  },
  runtime: {
    isTransactionPending: 0,
    lastUpdateDb: 0,
    currentHubUrl: '',
    currentAuthRealm: '',
    authorizationRequest: null,
    isFrameDisplayed: false
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
    isFrameDisplayed: state.runtime.isFrameDisplayed
  }
}
