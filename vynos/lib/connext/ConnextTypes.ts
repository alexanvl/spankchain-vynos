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
  WITHDRAWAL = 'WITHDRAWAL'
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
  state: string 
  tokenBalanceA: string 
  tokenBalanceI: string
  nonce: number 
  openVcs: number 
  vcRootHash: string 
  openTimeout: any 
  updateTimeout: any
}

export interface MetaFields {
  streamId: string
  streamName: string
  peformerId: string
  peformerName: string
}

export interface WithdrawalFields {recipient: string}

export type Meta = {
  fields: MetaFields|WithdrawalFields
  receiver: string
  type: PurchaseMetaType
}

export interface BalanceType {
  ethDeposit?: BN
  tokenDeposit?: BN
}

export interface PaymentObject {
  type: ChannelType
  meta: Meta
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

  openThread: (thread: {to: string, deposit: {ethDeposit: BN, tokenDeposit?: BN}}, sender?: string) => string

  getThreadById: (threadId: string) => VirtualChannel

  closeChannel: (sender?: string) => string

  closeThreads: (channelIds: string[], sender?: string) => any[]

  deposit: (deposit: Deposit, sender?: string, recipient?: string, tokenAddress?: string) => any

  requestHubDeposit: (params: {channelId: string, deposit: Deposit}) => string

  getChannelByPartyA: (partyA?: string, status?: any) => LedgerChannel

  getUnjoinedChannels: (addressA: string) => VirtualChannel[]

  joinChannel: (channelId: number, address: string) => any
}
