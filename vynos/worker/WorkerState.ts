import Wallet from 'ethereumjs-wallet'
import {PurchaseMetaFields, PurchaseMetaType, VirtualChannel, LedgerChannel} from '../lib/connext/ConnextTypes'
import { ICurrency } from '../lib/currency/Currency'

export type MigrationState = 'AWAITING_ETH' | 'MIGRATING' | 'DONE'

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
  isPendingVerification: boolean
  needsCollateral: boolean
  forceRedirect?: string
  branding: BrandingState
  channel: ChannelState
  history: HistoryItem[]
  addressBalances: Balances
  pendingTransaction: PendingTransaction | null
  hasActiveWithdrawal: boolean
  hasActiveDeposit: boolean
  hasActiveExchange: boolean
  activeWithdrawalError: string|null
  exchangeRates: ExchangeRates|null
  username: string|null
  baseCurrency: CurrencyType
  featureFlags: FeatureFlags
  moreEthNeeded: boolean
  migrationState: MigrationState
}

export interface AuthorizationRequestState {
  hubUrl: string
  authRealm: string
}

export interface Balances {
  ethBalance: ICurrency
  tokenBalance: ICurrency
}

export interface ChannelState {
  ledgerId: string
  balances: Balances
  currentVCs: VirtualChannel[]
  lc: LedgerChannel
}

export enum CurrencyType {
  USD = 'USD',
  ETH = 'ETH',
  WEI = 'WEI',
  FINNEY = 'FINNEY',
  BOOTY = 'BOOTY',
  BEI = 'BEI',
}

export type ExchangeRates = {[key: string/* in CurrencyType*/]: string}

export interface HistoryItem {
  payment: {
    channelId: string,
    meta: PurchaseMetaFields,
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
  priceWei: string
  priceToken: string
  receiver: string
}

export interface PendingTransaction {
  amount: string
  hash: string
}

export interface FeatureFlags {
  bootySupport?: boolean
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
  isPendingVerification: boolean
  needsCollateral: boolean
  branding: BrandingState
  channel: ChannelState
  history: HistoryItem[]
  addressBalances: Balances
  pendingTransaction: PendingTransaction | null
  address: string | null
  hasActiveWithdrawal: boolean
  hasActiveDeposit: boolean
  hasActiveExchange: boolean
  username: string | null
  activeWithdrawalError: string|null
  baseCurrency: CurrencyType
  exchangeRates: ExchangeRates|null
  featureFlags: FeatureFlags
  moreEthNeeded: boolean
  migrationState: MigrationState
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
  needsCollateral: false,
  branding: {
    address: ''
  },
  channel: {
    ledgerId: '',
    balances: {
      ethBalance: {
        type: CurrencyType.ETH,
        amount: '0',
      },
      tokenBalance: {
        type: CurrencyType.BOOTY,
        amount: '0',
      }
    },
    currentVCs: [],
    lc: {
      channelId: '',
      partyA: '',
      partyI: '',
      ethBalanceA: '',
      ethBalanceI: '',
      state: '',
      tokenBalanceA: '',
      tokenBalanceI: '',
      nonce: 0,
      openVcs: 0,
      vcRootHash: '',
      openTimeout: '',
      updateTimeout: '',
    }
  },
  history: [],
  addressBalances: {
    ethBalance: {
      type: CurrencyType.ETH,
      amount: '0'
    },
    tokenBalance: {
      type: CurrencyType.BOOTY,
      amount: '0'
    }
  },
  pendingTransaction: null,
  address: null,
  hasActiveWithdrawal: false,
  activeWithdrawalError: null,
  hasActiveDeposit: false,
  hasActiveExchange: false,
  exchangeRates: null,
  username: null,
  baseCurrency: CurrencyType.FINNEY,
  featureFlags: {},
  moreEthNeeded: false,
  migrationState: 'DONE'
}

const initialTransactionState = () => ({
  nextMethodIndex: 0,
  nextMethodArgs: []
})

export const GET_INITIAL_STATE = (): WorkerState => ({
  persistent: {
    didInit: false,
    rememberPath: '/',
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
    needsCollateral: false,
    forceRedirect: undefined,
    branding: {
      address: ''
    },
    channel: {
      ledgerId: '',
      balances: {
        ethBalance: {
          type: CurrencyType.ETH,
          amount: '0',
        },
        tokenBalance: {
          type: CurrencyType.BOOTY,
          amount: '0',
        }
      },
      currentVCs: [],
      lc: {
        channelId: '',
        partyA: '',
        partyI: '',
        ethBalanceA: '',
        ethBalanceI: '',
        state: '',
        tokenBalanceA: '',
        tokenBalanceI: '',
        nonce: 0,
        openVcs: 0,
        vcRootHash: '',
        openTimeout: '',
        updateTimeout: '',
      }
    },
    history: [],
    addressBalances: {
      ethBalance: {
        type: CurrencyType.ETH,
        amount: '0'
      },
      tokenBalance: {
        type: CurrencyType.BOOTY,
        amount: '0'
      }
    },
    pendingTransaction: null,
    hasActiveWithdrawal: false,
    hasActiveDeposit: false,
    hasActiveExchange: false,
    activeWithdrawalError: null,
    exchangeRates: null,
    username: null,
    baseCurrency: CurrencyType.FINNEY,
    featureFlags: {bootySupport: false},
    moreEthNeeded: false,
    migrationState: 'DONE',
  }
})

export const INITIAL_STATE = GET_INITIAL_STATE()

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
    needsCollateral: state.runtime.needsCollateral,
    isPendingVerification: state.runtime.isPendingVerification,
    branding: state.runtime.branding,
    channel: state.runtime.channel,
    history: state.runtime.history,
    addressBalances: state.runtime.addressBalances,
    pendingTransaction: state.runtime.pendingTransaction,
    address: state.runtime.wallet ? state.runtime.wallet.getAddressString() : null,
    hasActiveWithdrawal: state.runtime.hasActiveWithdrawal,
    activeWithdrawalError: state.runtime.activeWithdrawalError,
    hasActiveDeposit: state.runtime.hasActiveDeposit,
    hasActiveExchange: state.runtime.hasActiveExchange,
    exchangeRates: state.runtime.exchangeRates,
    username: state.runtime.username,
    baseCurrency: state.runtime.featureFlags.bootySupport ? CurrencyType.BOOTY : CurrencyType.FINNEY,
    featureFlags: state.runtime.featureFlags,
    moreEthNeeded: false,
    migrationState: state.runtime.migrationState,
  }
}
