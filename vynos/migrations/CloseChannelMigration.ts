import BaseMigration from './Migration'
import Logger from '../lib/Logger'
import CloseChannelTransaction from '../lib/transactions/CloseChannelTransaction'

export default class CloseChannelMigration extends BaseMigration {
  private closeChannelTx: CloseChannelTransaction

  constructor (logger: Logger, name: string, address: string, closeChannelTx: CloseChannelTransaction) {
    super(logger, name, address)
    this.closeChannelTx = closeChannelTx
  }

  async execute (): Promise<void> {
    await this.closeChannelTx.execute()
  }
}
