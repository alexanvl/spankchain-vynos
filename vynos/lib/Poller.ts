import Logger from '../lib/Logger'

/**
 * Poller hnadles a function that needs to be run once every intervalLength time
 *
 * @public start
 * @param {number} intervalLength - how long after last completion should the function be ran again
 * @param {function} cb - the function that should be run once every intervalLength
 * @example
 *
 * Author: William Cory -- GitHub: roninjin10
 */

export default class Poller {
  private polling = false
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  public start = async (intervalLength: number, cb: Function): Promise<void> => {
    if (this.polling) {
      throw new Error('Poller was already started')
    }

    this.polling = true
    await cb()
    let lastPolled: number = Date.now()

    const poll = async () => {
      if (!this.polling) {
        return
      }

      if (this.isReadyToPoll(lastPolled, intervalLength)) {
        try {
          await cb()
        } catch(e) {
          this.logger.logToApi([{
            name: `${this.logger.source}:`,
            ts: new Date(),
            data: {
              message: `Error has occurred in poller: ${e.message || e}`,
              type: 'error',
              stack: e.stack || e
            }
          }])
        }
        lastPolled = Date.now()
      }

      const nextPoll = intervalLength - (Date.now() - lastPolled)
      setTimeout(
        poll,
        nextPoll,
      )
    }
    poll()
  }

  public stop = async (): Promise<void> => {
    this.polling = false
  }

  public isStarted(): boolean {
    return this.polling
  }

  private isReadyToPoll = (lastPolled: number, intervalLength: number): boolean => Date.now() - lastPolled > intervalLength
}
