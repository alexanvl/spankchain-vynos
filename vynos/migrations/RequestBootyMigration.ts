import BaseMigration from './Migration'
import Logger from '../lib/Logger'
import RequestBootyTransaction from '../lib/transactions/RequestBootyTransaction'
import getTokenBalance from '../lib/web3/getTokenBalance'
import Web3 = require('web3')

export default class RequestBootyMigration extends BaseMigration {
  private requestBootyTx: RequestBootyTransaction
  private web3: Web3
  protected address: string

  constructor (logger: Logger, name: string, address: string, web3: Web3, requestBootyTx: RequestBootyTransaction) {
    super(logger, name, address)
    this.requestBootyTx = requestBootyTx
    this.web3 = web3
    this.address = address
  }

  async execute (): Promise<void> {
    const tokenBalance = await getTokenBalance(this.web3, this.address)

    if (tokenBalance.compare('gt', '0')) {
      console.log('Already have booty, so skipping migration.')
      return
    }

    return this.requestBootyTx.startTransaction()
  }
}
