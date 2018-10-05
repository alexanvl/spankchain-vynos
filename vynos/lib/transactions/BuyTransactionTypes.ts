import BN = require('bn.js')

export type ChannelState = any

export enum PurchaseMetaType {
  PURCHASE = 'PURCHASE',
  TIP = 'TIP',
  WITHDRAWAL = 'WITHDRAWAL'
}

export enum ChannelType {
  LEDGER = 'LEDGER',
  VIRTUAL = 'VIRTUAL',
}

export interface MetaFields {
  streamId: string
  streamName: string
  peformerId: string
  peformerName: string
}

export type Meta = {
  fields: MetaFields
  receiver: string
  type: PurchaseMetaType
}

export interface BalanceType {
  ethDeposit?: BN
  tokenDeposit?: BN
}

// args for Connext.update
export interface PaymentObject {
  type: ChannelType
  meta: Meta
  payment: {
    channelId: string
    balanceA: BalanceType
    balanceB: BalanceType
  }
}
