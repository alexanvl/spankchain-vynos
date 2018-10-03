import BN = require('bn.js')

export interface VirtualChannel {
  state: number
  ethBalanceA: string
  ethBalanceB: string
  tokenBalanceA: string 
  tokenBalanceB: string 
  channelId: string
  partyA: string
  partyB: string
  partyI: string
  subchanAtoI: string
  subchanBtoI: string
  nonce: number
}

export enum PurchaseMetaType {
  PURCHASE = 'PURCHASE',
  TIP = 'TIP',
  WITHDRAWAL = 'WITHDRAWAL',
  EXCHANGE = 'EXCHANGE',
}

export enum PaymentMetaType {
  FEE = 'FEE',
  PRINCIPAL = 'PRINCIPAL'
}

export enum ChannelType {
  LEDGER = 'LEDGER',
  VIRTUAL = 'VIRTUAL',
}

// Note: coppied from hub/src/domain/LedgerChannel.ts
export interface LedgerChannel {
  state: string // LcStatus
  ethBalanceA: string
  ethBalanceI: string
  tokenBalanceA: string
  tokenBalanceI: string
  channelId: string
  partyA: string
  partyI: string
  nonce: number 
  openVcs: number 
  vcRootHash: string 
  openTimeout: any 
  updateTimeout: any
}

export interface PurchaseMetaFields {
  streamId: string
  streamName: string
  performerId: string
  performerName: string
}

export interface WithdrawalFields {recipient: string}

export type PurchaseMeta = {
  fields: PurchaseMetaFields
  type: PurchaseMetaType
}

export type PaymentMeta = {
  fields?: WithdrawalFields
  receiver: string
  // Note: for backwards compatibility, allow payments to use purchase types
  // to reduce the amount we'll need to change on the hub side. Eventually
  // this type should come entirely from the purchase, though.
  type: PaymentMetaType | PurchaseMetaType
  exchangeRate?: any
}

export interface BalanceType {
  ethDeposit?: BN
  tokenDeposit?: BN
}

export interface PaymentType {
  channelId: string
  balanceA: BalanceType
  balanceB: BalanceType
}

export interface PaymentObject {
  type: ChannelType
  meta: PaymentMeta
  payment: PaymentType
}

export interface Deposit {
  ethDeposit: BN;
  tokenDeposit?: BN | null;
}

// Note: coppied from hub/src/domain/VirtualChannel.ts
export interface VcStateUpdate {
  id: number
  channelId: string
  nonce: number
  ethBalanceA: string
  ethBalanceB: string
  tokenBalanceA: string
  tokenBalanceB: string
  price?: string
  sigA?: string
  sigB?: string
  createdAt: number
}

// Note: coppied from hub/src/domain/LedgerChannel.ts
export interface LcStateUpdate {
  id: number
  channelId: string
  isClose: boolean
  nonce: number
  openVcs: number
  vcRootHash: string
  ethBalanceA: string
  ethBalanceI: string
  tokenBalanceA: string
  tokenBalanceI: string
  price?: string
  sigA?: string
  sigI?: string
}


export interface UpdateBalancesResult {
  purchaseId: string
  receipts: Array<
    ({ type: ChannelType.LEDGER } & LcStateUpdate) |
    ({ type: ChannelType.VIRTUAL } & VcStateUpdate)
  >
}

export interface IConnext {
  openChannel: (initialDeposits: Deposit, tokenAddresss?: string, sender?: string, challenge?: string) => Promise<string>

  updateBalances: (update: PaymentObject[], sender?: string) => UpdateBalancesResult

  openThread: (thread: {to: string, deposit: {ethDeposit: BN} | {tokenDeposit: BN}}, sender?: string) => string

  getThreadById: (threadId: string) => VirtualChannel

  closeChannel: (sender?: string) => string

  closeThreads: (channelIds: string[], sender?: string) => any[]

  deposit: (deposit: Deposit, sender?: string, recipient?: string, tokenAddress?: string) => any

  requestHubDeposit: (params: {channelId: string, deposit: Deposit}) => string

  getChannelByPartyA: (partyA?: string, status?: any) => LedgerChannel

  getUnjoinedChannels: (addressA: string) => VirtualChannel[]

  joinChannel: (channelId: number, address: string) => any
}
