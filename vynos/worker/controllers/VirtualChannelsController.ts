import AbstractController from './AbstractController'
import Logger from '../../lib/Logger'
import ChannelPopulator from '../../lib/ChannelPopulator'
import {BasePoller} from '../../lib/poller/BasePoller'
import {Poller} from '../../lib/poller/Poller'

export default class VirtualChannelsController extends AbstractController {
  private poller: Poller
  private chanPopulator: ChannelPopulator
  static INTERVAL_LENGTH = 60000

  constructor (
    logger: Logger,
    chanPopulator: ChannelPopulator
  ) {
    super(logger)
    this.poller = new BasePoller(logger)
    this.chanPopulator = chanPopulator
  }

  public start = async (): Promise<void> => {
    if (this.poller.isStarted()) {
      return
    }

    this.poller.start(
      this.populateChannels,
      VirtualChannelsController.INTERVAL_LENGTH
    )
  }

  public stop = async (): Promise<void> => {
    if (!this.poller.isStarted) {
      return
    }

    this.poller.stop()
  }

  private populateChannels = async (): Promise<void> => {
    await this.chanPopulator.populate()
  }
}
