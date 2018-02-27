import actionCreatorFactory, {ActionCreator} from 'typescript-fsa'
import {WorkerState} from './WorkerState'
import Wallet from 'ethereumjs-wallet'

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

export const setCurrentAuthRealm = actionCreator<string>('runtim/setAuthRealm')
export function setCurrentAuthRealmHandler(state: WorkerState, currentAuthRealm: string): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      currentAuthRealm
    }
  }
}

export interface SetBrandingParam {
  hubUrl: string
  cardName: string
  cardImageUrl: string
}

export const setHubBranding = actionCreator<SetBrandingParam>('persistent/setHubBranding')
export function setHubBrandingHandler(state: WorkerState, branding: SetBrandingParam): WorkerState {
  return {
    ...state,
    persistent: {
      ...state.persistent,
      branding: {
        ...state.persistent.branding,
        [branding.hubUrl]: {
          cardName: branding.cardName,
          cardImageUrl: branding.cardImageUrl
        }
      }
    }
  }
}

export const toggleFrame = actionCreator<boolean>('runtime/toggleFrame')
export function toggleFrameHandler(state: WorkerState, isFrameDisplayed: boolean): WorkerState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      isFrameDisplayed
    }
  }
}
