import BaseMigration from './Migration'
import Logger from '../lib/Logger'
import BuyBootyTransaction from '../lib/transactions/BuyBootyTransaction'

export default class ExchangeMigration extends BaseMigration {
  private tx: BuyBootyTransaction

  constructor (logger: Logger, name: string, address: string, tx: BuyBootyTransaction) {
    super(logger, name, address)
    this.tx = tx
  }

  execute (): Promise<void> {
    return this.tx.start() as Promise<void>
  }
}
