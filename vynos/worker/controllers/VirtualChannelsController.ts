import AbstractController from './AbstractController'
import {LifecycleAware} from './LifecycleAware'
import Logger from '../../lib/Logger'
import {LockablePoller} from '../../lib/poller/LockablePoller'
import LockStateObserver from '../../lib/LockStateObserver'
import ChannelPopulator from '../../lib/ChannelPopulator'

export default class VirtualChannelsController extends AbstractController implements LifecycleAware {
  private poller: LockablePoller
  private chanPopulator: ChannelPopulator
  static INTERVAL_LENGTH = 60000

  constructor (
    logger: Logger,
    lockStateObserver: LockStateObserver,
    chanPopulator: ChannelPopulator
  ) {
    super(logger)
    this.poller = new LockablePoller(logger, lockStateObserver)
    this.chanPopulator = chanPopulator
  }

  public start = async (): Promise<void> => {
    if (this.poller.isStarted()) {
      return
    }
    this.poller.start(
      this.populateChannels,
      VirtualChannelsController.INTERVAL_LENGTH,
    )
  }

  public stop = async (): Promise<void> => {
    this.poller.stop()
  }

  private populateChannels = async (): Promise<void> => {
    await this.chanPopulator.populate()
  }
}
