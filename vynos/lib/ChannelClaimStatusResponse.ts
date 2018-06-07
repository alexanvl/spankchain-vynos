export enum ChannelClaimStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',

  /*
   * State returned from machinomy's PaymentChannel object.
   * 2 denotes that the channel is closed.
   */
  CONVERGED = 2,
}

export default interface ChannelClaimStatusResponse {
  channelId: string
  status: ChannelClaimStatus|null
  createdAt: number
  pendingAt: number|null
  confirmedAt: number|null
  failedAt: number
}

export const CLOSE_CHANNEL_ERRORS = {
  ALREADY_IN_PROGRESS: 'Withdrawal already in progress. It will take about 30 seconds.',
  UNKNOWN_STATUS: 'Incompatible claim status. Expect "FAILED", "NEW", "PENDING", "CONFIRMED", or null.',
  FAILED: 'Withdrawal failed. Please try again.',
  CONVERGENCE_FAILED: 'Withdrawal status not in sync. Please try again.',
}
