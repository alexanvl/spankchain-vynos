import {JSONRPC, RequestPayload, ResponsePayload} from '../Payload'
import {SharedState} from '../../worker/WorkerState'
import VynosBuyResponse from '../VynosBuyResponse'
import PurchaseMeta from '../PurchaseMeta'
import {SerializedPaymentChannel} from 'machinomy/dist/lib/payment_channel'

export interface RequestConstructor {
  method: string
  match(payload: RequestPayload): boolean
  new (): RequestPayload
}

function requestFactory<P>(method: string): RequestConstructor {
  method = `yns_${method}`

  return class GeneratedRequestPayload implements RequestPayload {
    id: number
    jsonrpc: typeof JSONRPC
    method: string
    params: P

    static method: string = method

    static match (payload: RequestPayload): payload is GeneratedRequestPayload {
      return payload.method === method
    }
  }
}

export const InitializeRequest = requestFactory<[string, string]>('initialize')
export type InitializeRequest = RequestPayload

export interface InitializeResponse extends ResponsePayload {
  result: boolean
}

export const AuthenticateRequest = requestFactory<[string, string]>('authenticate')
export type AuthenticateRequest = RequestPayload

export interface AuthenticateResponse extends ResponsePayload {
  result: { success: boolean, token?: string }
}

export const InitAccountRequest = requestFactory<any[]>('initAccount')
export type InitAccountRequest = RequestPayload

export interface InitAccountResponse extends ResponsePayload {
  result: string[]
}

export const GetSharedStateRequest = requestFactory<any[]>('getSharedState')
export type GetSharedStateRequest = RequestPayload

export interface GetSharedStateResponse extends ResponsePayload {
  result: SharedState
}

export const DidStoreMnemonicRequest = requestFactory<any[]>('didStoreMnemonic')
export type DidStoreMnemonicRequest = RequestPayload

export interface DidStoreMnemonicResponse extends ResponsePayload {
  result: null
}

export const RememberPageRequest = requestFactory<[string]>('rememberPage')
export type RememberPageRequest = RequestPayload

export interface RememberPageResponse extends ResponsePayload {
  result: null
}

export const GenKeyringRequest = requestFactory<string[]>('genKeyring')
export type GenKeyringRequest = RequestPayload

export interface GenKeyringResponse extends ResponsePayload {
  result: string
}

export const RestoreWalletRequest = requestFactory<[string, string]>('restoreWallet')
export type RestoreWalletRequest = RequestPayload

export interface RestoreWalletResponse extends ResponsePayload {
  result: string
}

export const UnlockWalletRequest = requestFactory<string[]>('unlockWallet')
export type UnlockWalletRequest = RequestPayload

export interface UnlockWalletResponse extends ResponsePayload {
  result: null
  error?: string
}

export const LockWalletRequest = requestFactory<string[]>('lockWallet')
export type LockWalletRequest = RequestPayload

export interface LockWalletResponse extends ResponsePayload {
  result: null
}

export const OpenChannelRequest = requestFactory<[string]>('openChannel')
export type OpenChannelRequest = RequestPayload

export interface OpenChannelResponse extends ResponsePayload {
  result: string
}

export const CloseChannelRequest = requestFactory<[string]>('closeChannel')
export type CloseChannelRequest = RequestPayload

export interface CloseChannelResponse extends ResponsePayload {
  result: [string] //
}

export const BuyRequest = requestFactory<[string, any]>('buyRequest')
export type BuyRequest = RequestPayload

export interface BuyResponse extends ResponsePayload {
  result: VynosBuyResponse
}

export const TransactonResolved = requestFactory<never[]>('transactionResolved')
export type TransactonResolved = RequestPayload

export const ListChannelsRequest = requestFactory<any[]>('listChannels')
export type ListChannelsRequest = RequestPayload

export interface ListChannelsResponse extends ResponsePayload {
  result: Array<SerializedPaymentChannel>
}

export const PopulateChannelsRequest = requestFactory<any[]>('populateChannels')
export type PopulateChannelsRequest = RequestPayload

export interface PopulateChannelsResponse extends ResponsePayload {
  result: null
}

export const ChangeNetworkRequest = requestFactory<any[]>('changeNetwork')
export type ChangeNetworkRequest = RequestPayload

export interface ChangeNetworkResponse extends ResponsePayload {
  result: string
}

export const GetPrivateKeyHexRequest = requestFactory<never[]>('getPrivateKeyHex')
export type GetPrivateKeyHexRequest = RequestPayload

export interface GetPrivateKeyHexResponse extends ResponsePayload {
  result: string
}

export const SetAuthorizationRequestRequest = requestFactory<[string, string]>('setAuthorizationRequest')
export type SetAuthorizationRequestRequest = RequestPayload

export interface SetAuthorizationRequestResponse extends ResponsePayload {
  result: null
}

export const RespondToAuthorizationRequestRequest = requestFactory<[boolean]>('respondToAuthorizationRequest')
export type RespondToAuthorizationRequestRequest = RequestPayload

export interface RespondToAuthorizationRequestResponse extends ResponsePayload {
  result: null
}

export const ToggleFrameRequest = requestFactory<[boolean]>('toggleFrame')
export type ToggleFrameRequest = RequestPayload

export interface ToggleFrameResponse extends ResponsePayload {
  result: null
}


