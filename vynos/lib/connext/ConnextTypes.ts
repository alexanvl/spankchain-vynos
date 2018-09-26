import BN = require('bn.js')

export interface VirtualChannel {
  state: number
  ethBalanceA: string
  ethBalanceB: string
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
  WITHDRAWAL = 'WITHDRAWAL'
}

export enum PaymentMetaType {
  FEE = 'FEE',
  PRINCIPAL = 'PRINCIPAL'
}

export enum ChannelType {
  LEDGER = 'LEDGER',
  VIRTUAL = 'VIRTUAL',
  WITHDRAWAL = 'WITHDRAWAL',
}

export interface LedgerChannel {
  channelId: string
  partyA: string
  partyI: string
  ethBalanceA: string
  ethBalanceI: string
}

export interface MetaFields {
  streamId: string
  streamName: string
  peformerId: string
  peformerName: string
}

export interface WithdrawalFields {recipient: string}

export type PurchaseMeta = {
  fields: MetaFields|WithdrawalFields
  merchant: string
  type: PurchaseMetaType
}

export type PaymentMeta = {
  fields: MetaFields|WithdrawalFields
  receiver: string
  type: PaymentMetaType
}

export interface BalanceType {
  ethDeposit?: BN
  tokenDeposit?: BN
}

export interface PaymentObject {
  type: ChannelType
  meta: PaymentMeta
  payment: {
    channelId: string
    balanceA: BalanceType
    balanceB: BalanceType
  }
}

export interface Deposit {
  ethDeposit: BN;
  tokenDeposit?: BN | null;
}

export interface IConnext {
  openChannel: (initialDeposits: Deposit, tokenAddresss?: string, sender?: string, challenge?: string) => Promise<string>

  updateBalances: (update: PaymentObject[], sender?: string) => any

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
