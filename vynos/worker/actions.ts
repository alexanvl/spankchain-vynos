import actionCreatorFactory, {ActionCreator} from 'typescript-fsa'
import {HistoryItem, WorkerState} from './WorkerState'
import Wallet from 'ethereumjs-wallet'
import {SerializedPaymentChannel} from 'machinomy/dist/lib/payment_channel'
import {Cookie} from 'tough-cookie'
import Serialized = Cookie.Serialized

const actionCreator = actionCreatorFactory('worker')

// Runtime
export const setWallet = actionCreator<Wallet|undefined>('runtime/setWallet')
export function setWalletHandler(state: WorkerState, wallet: Wallet|undefined): WorkerState {
  return { ...state,
    runtime: { ...state.runtime, wallet },
  }
}

// Persistent
export const setKeyring = actionCreator<string>('persistent/setKeyring')
export function setKeyringHandler(state: WorkerState, keyring: string): WorkerState {
  return { ...state,
    persistent: { ...state.persistent, keyring },
  }
}

export interface RestoreWalletParam {
  keyring: string,
  wallet: Wallet
}
export const restoreWallet = actionCreator<RestoreWalletParam>('persistent+runtime/restoreWallet')
export function restoreWalletHandler(state: WorkerState, param: RestoreWalletParam): WorkerState {
  return { ...state,
    persistent: { ...state.persistent, didInit: true, keyring: param.keyring },
    runtime: { ...state.runtime, wallet: param.wallet },
  }
}

export const setDidStoreMnemonic = actionCreator<boolean>('persistent/setDidStoreMnemonic')
export function setDidStoreMnemonicHandler(state: WorkerState): WorkerState {
  return {
    ...state,
    persistent: { ...state.persistent, didInit: true },
  }
}

export const setTransactionPending = actionCreator<boolean>('runtime/setTransactionPending')
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

export interface AuthorizationRequestParam {
  hubUrl: string
  authRealm: string
}

export const setAuthorizationRequest = actionCreator<AuthorizationRequestParam>('runtime/authorizationRequest')
export function setAuthorizationRequestHandler(state: WorkerState, authorizationRequest: AuthorizationRequestParam): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      authorizationRequest
    }
  }
}

export const respondToAuthorizationRequest = actionCreator<boolean>('runtime/respondToAuthorizationRequest')
export function respondToAuthorizationRequestHandler(state: WorkerState, response: boolean): WorkerState {
  const newState = {
    ...state,
    runtime: {
      ...state.runtime,
      authorizationRequest: null
    }
  }

  if (response) {
    newState.persistent = {
      ...state.persistent,
      authorizedHubs: {
        ...state.persistent.authorizedHubs,
        [state.runtime.authorizationRequest!.hubUrl]: true
      }
    }
  }

  return newState
}

export const rememberPage = actionCreator<string>('persistent/rememberPage')
export function rememberPageHandler(state: WorkerState, path: string): WorkerState {
  return {
    ...state,
    persistent: { ...state.persistent, rememberPath: path },
  }
}

export const setLastUpdateDb = actionCreator<number>('runtime/setLastUpdateDb')
export function setLastUpdateDbHandler(state: WorkerState, timestamp: number): WorkerState {
  return {
    ...state,
    runtime: {...state.runtime, lastUpdateDb: timestamp},
  }
}

export const setCurrentHubUrl = actionCreator<string>('runtime/setCurrentHub')
export function setCurrentHubUrlHandler(state: WorkerState, currentHubUrl: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentHubUrl
    }
  }
}

export const setCurrentAuthRealm = actionCreator<string>('runtime/setAuthRealm')
export function setCurrentAuthRealmHandler(state: WorkerState, currentAuthRealm: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentAuthRealm
    }
  }
}

export const setCurrentAuthToken = actionCreator<string>('runtime/setCurrentAuthToken')
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

export const setHubBranding = actionCreator<SetBrandingParam>('persistent/setHubBranding')
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
}

export const toggleFrame = actionCreator<ToggleFrameParam>('runtime/toggleFrame')
export function toggleFrameHandler(state: WorkerState, payload: ToggleFrameParam): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      isFrameDisplayed: payload.isFrameDisplayed,
      forceRedirect: payload.forceRedirect,
    }
  }
}

export const setChannels = actionCreator<SerializedPaymentChannel[]>('runtime/setChannels')
export function setChannelsHandler(state: WorkerState, channels: SerializedPaymentChannel[]): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      channels: {
        ...state.runtime.channels,
        [state.runtime.currentHubUrl]: channels
      }
    }
  }
}

export const setChannel = actionCreator<SerializedPaymentChannel>('runtime/setChannel')
export function setChannelHandler(state: WorkerState, channel: SerializedPaymentChannel): WorkerState {
  let channels = state.runtime.channels[state.runtime.currentHubUrl] || []
  channels = [].concat(channels as any)

  const index = channels.findIndex((ch: SerializedPaymentChannel) => ch.channelId === channel.channelId)

  if (index === -1) {
    channels.push(channel)
  } else {
    channels[index] = channel
  }

  return {
    ...state,
    runtime: {
      ...state.runtime,
      channels: {
        ...state.runtime.channels,
        [state.runtime.currentHubUrl]: channels
      }
    }
  }
}

export const setHistory = actionCreator<HistoryItem[]>('runtime/setHistory')
export function setHistoryHandler(state: WorkerState, history: HistoryItem[]): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      history
    }
  }
}

export const updateWalletBalance = actionCreator<number>('runtime/updateWalletBalance')
export function updateWalletBalanceHandler(state: WorkerState, balance: number): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      updatedBalance: balance
    }
  }
}
