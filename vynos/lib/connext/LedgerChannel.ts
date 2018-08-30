export default interface LedgerChannel {
  state: number
  ethBalanceA: string
  ethBalanceI: string
  channelId: string
  partyA: string
  partyI: string
  nonce: number
  openVcs: number
  vcRootHash: string
}
