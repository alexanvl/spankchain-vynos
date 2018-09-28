import Logger from '../lib/Logger'

export interface Migration {
  execute (): Promise<void>
}

export default abstract class BaseMigration implements Migration {
  protected logger: Logger

  protected name: string

  protected address: string

  protected constructor (logger: Logger, name: string, address: string) {
    this.logger = logger
    this.name = name
    this.address = address
  }

  abstract execute (): Promise<void>
}
