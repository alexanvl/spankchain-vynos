import Wallet from 'ethereumjs-wallet'
import {MetaFields, PurchaseMetaType, VirtualChannel} from '../lib/connext/ConnextTypes'

export interface RuntimeState {
  wallet?: Wallet
  isTransactionPending: number
  lastUpdateDb: number
  currentHubUrl: string
  currentAuthRealm: string
  currentAuthToken: string
  authorizationRequest: AuthorizationRequestState | null
  isFrameDisplayed: boolean
  isPerformer?: boolean
  isPendingVerification?: boolean
  forceRedirect?: string
  branding: BrandingState
  channel: ChannelState | null
  history: HistoryItem[]
  balance: string
  pendingTransaction: PendingTransaction | null
  hasActiveWithdrawal: boolean
  activeWithdrawalError: string|null
  exchangeRates: ExchangeRates|null
  username: string | null
  baseCurrency: any
}

export interface AuthorizationRequestState {
  hubUrl: string
  authRealm: string
}

export interface ChannelState {
  ledgerId: string
  balance: string
  currentVCs: VirtualChannel[]
}

export enum CurrencyType {
  USD = 'USD',
  ETH = 'ETH',
  WEI = 'WEI',
  FINNEY = 'FINNEY',
}

export type ExchangeRates = {[key: string/* in CurrencyType*/]: string}

export interface HistoryItem {
  payment: {
    channelId: string,
    meta: MetaFields,
    token: string
  }
  fields: {
    performerId?: string,
    performerName?: string,
    streamId?: string,
    streamName?: string,
    productName?: string,
    productSku?: string,
    recipient?: string,
    tipperName?: string,
  }
  createdAt: number
  type: PurchaseMetaType
  price: string
  receiver: string
}

export interface PendingTransaction {
  amount: string
  hash: string
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
  authorizationRequest: AuthorizationRequestState | null
  isFrameDisplayed: boolean
  forceRedirect?: string
  isPerformer?: boolean
  isPendingVerification?: boolean
  branding: BrandingState
  channel: ChannelState | null
  history: HistoryItem[]
  balance: string
  pendingTransaction: PendingTransaction | null
  address: string | null
  hasActiveWithdrawal: boolean
  hasActiveDeposit: boolean
  username: string | null
  activeWithdrawalError: string|null
  exchangeRates: ExchangeRates | null
  baseCurrency: any
}

export interface AtomicTransactionState {
  nextMethodIndex: number
  nextMethodArgs: any[]
}

export interface TransactionsState {
  [key: string]: AtomicTransactionState
}

export interface PersistentState {
  didInit: boolean,
  keyring?: string,
  rememberPath: string
  hasActiveDeposit: boolean
  transactions: TransactionsState
}

export interface BrandingState {
  title?: string
  companyName?: string
  backgroundColor?: string
  textColor?: string
  address: string
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
  authorizationRequest: null,
  currentHubUrl: process.env.HUB_URL!,
  currentAuthRealm: '',
  currentAuthToken: '',
  isFrameDisplayed: false,
  isPerformer: false,
  isPendingVerification: false,
  branding: {
    address: ''
  },
  channel: null,
  history: [],
  balance: '0',
  pendingTransaction: null,
  address: null,
  hasActiveWithdrawal: false,
  activeWithdrawalError: null,
  hasActiveDeposit: false,
  exchangeRates: null,
  username: null,
  baseCurrency: null
}

const initialTransactionState = () => ({
  nextMethodIndex: 0,
  nextMethodArgs: []
})

export const INITIAL_STATE: WorkerState = {
  persistent: {
    didInit: false,
    rememberPath: '/',
    hasActiveDeposit: false,
    transactions: {}
  },
  runtime: {
    isTransactionPending: 0,
    lastUpdateDb: 0,
    currentHubUrl: process.env.HUB_URL!,
    currentAuthRealm: '',
    currentAuthToken: '',
    authorizationRequest: null,
    isFrameDisplayed: false,
    isPerformer: false,
    isPendingVerification: false,
    forceRedirect: undefined,
    branding: {
      address: ''
    },
    channel: null,
    history: [],
    balance: '0',
    pendingTransaction: null,
    hasActiveWithdrawal: false,
    activeWithdrawalError: null,
    exchangeRates: null,
    username: null,
    baseCurrency: CurrencyType.FINNEY,
  }
}

export function buildSharedState (state: WorkerState): SharedState {
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
    isFrameDisplayed: state.runtime.isFrameDisplayed,
    forceRedirect: state.runtime.forceRedirect,
    isPerformer: state.runtime.isPerformer,
    isPendingVerification: state.runtime.isPendingVerification,
    branding: state.runtime.branding,
    channel: state.runtime.channel,
    history: state.runtime.history,
    balance: state.runtime.balance,
    pendingTransaction: state.runtime.pendingTransaction,
    address: state.runtime.wallet ? state.runtime.wallet.getAddressString() : null,
    hasActiveWithdrawal: state.runtime.hasActiveWithdrawal,
    activeWithdrawalError: state.runtime.activeWithdrawalError,
    hasActiveDeposit: state.persistent.hasActiveDeposit,
    exchangeRates: state.runtime.exchangeRates,
    username: state.runtime.username,
    baseCurrency: state.runtime.baseCurrency
  }
}
