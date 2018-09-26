import actionCreatorFactory, {ActionCreator} from 'typescript-fsa'
import {
  ChannelState,
  ExchangeRates,
  HistoryItem,
  PendingTransaction,
  WorkerState,
  AtomicTransactionState,
  INITIAL_STATE,
  FeatureFlags,
} from './WorkerState'
import Wallet from 'ethereumjs-wallet'

const actionCreator = actionCreatorFactory('worker')

// Runtime
export const setExchangeRates: ActionCreator<ExchangeRates> = actionCreator<ExchangeRates>('runtime/setExchangeRates')
export function setExchangeRatesHandler(state: WorkerState, newExchangeRates: ExchangeRates): WorkerState {
  return { ...state,
    runtime: {...state.runtime,
      exchangeRates: {...state.runtime.exchangeRates as ExchangeRates,
        ...newExchangeRates,
      }
    }
  }
}

export const setWallet: ActionCreator<Wallet|undefined> = actionCreator<Wallet|undefined>('runtime/setWallet')
export function setWalletHandler(state: WorkerState, wallet: Wallet|undefined): WorkerState {
  return { ...state,
    runtime: {
      ...state.runtime,
      currentAuthToken: '',
      wallet
    },
  }
}

export const setFeatureFlags: ActionCreator<FeatureFlags> = actionCreator<FeatureFlags>('runtime/setFeatureFlags')
export function setFeatureFlagsHandler(state: WorkerState, featureFlags: FeatureFlags): WorkerState {
  return { ...state,
    runtime: {
      ...state.runtime,
      featureFlags,
      ...state.runtime, // uncomment this to let wallet's feature flags take presedence over hub's feature flag's (useful for local debugging)
    }
  }
}

export const setIsPendingVerification: ActionCreator<boolean> = actionCreator<boolean>('runtime/setIsPeformerVerified')
export function setIsPendingVerificationHandler(state: WorkerState, isPendingVerification: boolean): WorkerState {
  return { ...state,
    runtime: {...state.runtime,
      isPendingVerification,
    }
  }
}

// Persistent
export const setKeyring: ActionCreator<string> = actionCreator<string>('persistent/setKeyring')
export function setKeyringHandler(state: WorkerState, keyring: string): WorkerState {
  return { ...state,
    persistent: { ...state.persistent, keyring },
  }
}

export interface RestoreWalletParam {
  keyring: string,
  wallet: Wallet
}
export const restoreWallet: ActionCreator<RestoreWalletParam> = actionCreator<RestoreWalletParam>('persistent+runtime/restoreWallet')
export function restoreWalletHandler(state: WorkerState, param: RestoreWalletParam): WorkerState {
  return { ...state,
    persistent: { ...state.persistent, didInit: true, keyring: param.keyring },
    runtime: { ...state.runtime, wallet: param.wallet },
  }
}

export const setDidStoreMnemonic: ActionCreator<boolean> = actionCreator<boolean>('persistent/setDidStoreMnemonic')
export function setDidStoreMnemonicHandler(state: WorkerState): WorkerState {
  return {
    ...state,
    persistent: { ...state.persistent, didInit: true },
  }
}

export const setHasActiveDeposit: ActionCreator<boolean> = actionCreator<boolean>('persistent/hasActiveDeposit')
export function setHasActiveDepositHandler(state: WorkerState, hasActiveDeposit: boolean): WorkerState {
  return {
    ...state,
      persistent: {
        ...state.persistent,
        hasActiveDeposit,
      }
  }
}

export interface SetTransactionStateParam {
  name: string,
  newState: AtomicTransactionState
}

// sets initial state if it hasn't been set already (like if inital state is pre migration)
export const setInitialState: ActionCreator<any> = actionCreator<any>('persistent/setInitialState')
export function setInitialStateHandler(state: WorkerState): WorkerState {
  return {
    ...INITIAL_STATE,
    ...state,
      persistent: {
        ...INITIAL_STATE.persistent,
        ...state.persistent,
      }
  }
}

export const setTransactionState: ActionCreator<SetTransactionStateParam> = actionCreator<SetTransactionStateParam>('persistent/setTransactionState')
export function setTransactionStateHandler(state: WorkerState, param: SetTransactionStateParam): WorkerState {
  const { name, newState } = param
  return {
    ...state,
    persistent: {
      ...state.persistent,
      transactions: {
        ...state.persistent.transactions,
        [name]: newState
      }
    }
  }
}

export const removeTransactionState: ActionCreator<string> = actionCreator<string>('persistent/removeTransactionState')
export function removeTransactionStateHandler(state: WorkerState, name: string): WorkerState {
  if (!state.persistent.transactions[name]) {
    return state
  }

  const transactions = JSON.parse(JSON.stringify(state.persistent.transactions))
  delete transactions[name]
  return {
    ...state,
    persistent: {
      ...state.persistent,
      transactions
    }
  }
}

export const setTransactionPending: ActionCreator<boolean> = actionCreator<boolean>('runtime/setTransactionPending')
export function setTransactionPendingHandler(state: WorkerState, pending: boolean): WorkerState {
  let pendingDate = 0
  if (pending) {
    pendingDate = Date.now()
  }
  return {
    ...state,
    runtime: { ...state.runtime, isTransactionPending: pendingDate },
  }
}

export const rememberPage: ActionCreator<string> = actionCreator<string>('persistent/rememberPage')
export function rememberPageHandler(state: WorkerState, path: string): WorkerState {
  return {
    ...state,
    persistent: { ...state.persistent, rememberPath: path },
  }
}

export const setLastUpdateDb: ActionCreator<number> = actionCreator<number>('runtime/setLastUpdateDb')
export function setLastUpdateDbHandler(state: WorkerState, timestamp: number): WorkerState {
  return {
    ...state,
    runtime: {...state.runtime, lastUpdateDb: timestamp},
  }
}

export const setCurrentHubUrl: ActionCreator<string> = actionCreator<string>('runtime/setCurrentHub')
export function setCurrentHubUrlHandler(state: WorkerState, currentHubUrl: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentHubUrl
    }
  }
}

export const setCurrentAuthRealm: ActionCreator<string> = actionCreator<string>('runtime/setAuthRealm')
export function setCurrentAuthRealmHandler(state: WorkerState, currentAuthRealm: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentAuthRealm
    }
  }
}

export const setCurrentAuthToken: ActionCreator<string> = actionCreator<string>('runtime/setCurrentAuthToken')
export function setCurrentAuthTokenHandler(state: WorkerState, currentAuthToken: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentAuthToken
    }
  }
}

export interface SetBrandingParam {
  title?: string
  companyName?: string
  username?: string
  backgroundColor?: string
  textColor?: string
  address: string
}

export const setHubBranding: ActionCreator<SetBrandingParam> = actionCreator<SetBrandingParam>('persistent/setHubBranding')
export function setHubBrandingHandler(state: WorkerState, branding: SetBrandingParam): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      branding
    }
  }
}

export interface ToggleFrameParam {
  isFrameDisplayed: boolean
  forceRedirect?: string
  isPerformer?: boolean
}

export const toggleFrame: ActionCreator<ToggleFrameParam> = actionCreator<ToggleFrameParam>('runtime/toggleFrame')
export function toggleFrameHandler(state: WorkerState, payload: ToggleFrameParam): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      isFrameDisplayed: payload.isFrameDisplayed,
      forceRedirect: payload.forceRedirect,
      isPerformer: payload.isPerformer,
    }
  }
}

export const setChannel: ActionCreator<ChannelState|null> = actionCreator<ChannelState|null>('runtime/setChannel')
export function setChannelHandler(state: WorkerState, channel: ChannelState|null): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      channel,
    }
  }
}

export const setHistory: ActionCreator<HistoryItem[]> = actionCreator<HistoryItem[]>('runtime/setHistory')
export function setHistoryHandler(state: WorkerState, history: HistoryItem[]): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      history
    }
  }
}

export const setBalance: ActionCreator<string> = actionCreator<string>('runtime/setBalance')
export function setBalanceHandler(state: WorkerState, balance: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      balance
    }
  }
}

export const setPendingTransaction: ActionCreator<PendingTransaction|null> = actionCreator<PendingTransaction|null>('runtime/setPendingTransaction')
export function setPendingTransactionHandler(state: WorkerState, pendingTransaction: PendingTransaction|null): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      pendingTransaction
    }
  }
}

export const reset: ActionCreator<null> = actionCreator<null>('runtime/reset')
export function resetHandler(): WorkerState {
  return undefined as any
}

export const setHasActiveWithdrawal: ActionCreator<boolean> = actionCreator<boolean>('runtime/setActiveWithdrawal')
export function setHasActiveWithdrawalHandler(state: WorkerState, hasActiveWithdrawal: boolean): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      hasActiveWithdrawal
    }
  }
}

export const setActiveWithdrawalError: ActionCreator<string|null> = actionCreator<string|null>('runtime/setActiveWithdrawalError')
export function setActiveWithdrawalErrorHandler(state: WorkerState, activeWithdrawalError: string|null): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      activeWithdrawalError,
    }
  }
}

export const setUsername: ActionCreator<string> = actionCreator<string>('runtime/setUsername')
export function setUsernameHandler(state: WorkerState, username: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      username
    }
  }
}

