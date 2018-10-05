import BaseMigration from './Migration'
import Logger from '../lib/Logger'
import RequestBootyTransaction from '../lib/transactions/RequestBootyTransaction'

export default class RequestBootyMigration extends BaseMigration {
  private requestBootyTx: RequestBootyTransaction

  constructor (logger: Logger, name: string, address: string, requestBootyTx: RequestBootyTransaction) {
    super(logger, name, address)
    this.requestBootyTx = requestBootyTx
  }

  execute (): Promise<void> {
    return this.requestBootyTx.startTransaction()
  }
}
