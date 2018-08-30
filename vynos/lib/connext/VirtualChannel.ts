export default interface VirtualChannel {
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
