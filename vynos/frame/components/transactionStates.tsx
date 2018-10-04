import * as React from 'react' // need this otherwise the file complains for having jsx

export const alertMessagesLong: any = {
  'AWAITING_ETH': <span>(copy to be updated) Please send some ETH to your SpankPay</span>, // TODO change these
  'MIGRATING': <span>(copy to be updated) Converting to BOOTY</span>,
  'MIGRATION_FAILED': <span>(copy to be updated) something went wrong in converting your wallet to BOOTY'</span>
}

export const alertMessagesShort: any = {
  'AWAITING_ETH': <span>Waiting for funds</span>, 
  'MIGRATING': <span>Funds Received <br/>Processing</span>,
  'MIGRATION_FAILED': <span>(copy to be updated) something went wrong in converting your wallet to BOOTY'</span>,
  'DONE': <span>Booty Credited</span>
}

const transactionStateOrder = ['AWAITING_ETH', 'MIGRATING', 'DONE']

export function getTransactionStep(state: string):number {
  return transactionStateOrder.indexOf(state) + 1
}

export function getTotalTransactionSteps(): number {
  return transactionStateOrder.length
}