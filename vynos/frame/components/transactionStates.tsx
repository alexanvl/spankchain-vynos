import * as React from 'react' // need this otherwise the file complains for having jsx

export const alertMessagesLong: any = {
  'AWAITING_ETH': <span>In order to start tipping, send some ETH to your SpankPay account</span>,
  'MIGRATING': <span>Getting your BOOTY ready</span>,
  'MIGRATION_FAILED': <span>Oh no! Something went wrong. Please contact us at <a href="mailto:support@spankchain.com">support@spankchain.com</a></span>
}

export const alertMessagesShort: any = {
  'AWAITING_ETH': <span>Waiting for funds</span>, 
  'MIGRATING': <span>Funds Received <br/>Processing</span>,
  'MIGRATION_FAILED': <span>Oh no! <br/>Something went wrong</span>,
  'DONE': <span>Booty Credited</span>
}

const transactionStateOrder = ['AWAITING_ETH', 'MIGRATING', 'DONE']

export function getTransactionStep(state: string):number {
  return transactionStateOrder.indexOf(state) + 1
}

export function getTotalTransactionSteps(): number {
  return transactionStateOrder.length
}