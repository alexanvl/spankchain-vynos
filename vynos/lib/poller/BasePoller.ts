import Logger from '../Logger'
import {Poller} from './Poller' 

export class BasePoller implements Poller {
  private polling = false
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  public async start (cb: Function, intervalLength: number): Promise<void> {
    if (this.polling) {
      throw new Error('Poller was already started')
    }

    this.polling = true
    let lastPolled: number 

    const poll = async () => {
      if (!this.polling) {
        return
      }

      if (!lastPolled || this.isReadyToPoll(lastPolled, intervalLength)) {
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
