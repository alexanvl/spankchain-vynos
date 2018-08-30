import AbstractController from './AbstractController'
import {LifecycleAware} from './LifecycleAware'
import Logger from '../../lib/Logger'
import Poller from '../../lib/Poller'
import LockStateObserver from '../../lib/LockStateObserver'
import ChannelPopulator from '../../lib/ChannelPopulator'

export default class VirtualChannelsController extends AbstractController implements LifecycleAware {
  private poller: Poller
  private lockStateObserver: LockStateObserver
  private chanPopulator: ChannelPopulator
  private isRunning: boolean = false
  static INTERVAL_LENGTH = 60000

  constructor (
    logger: Logger,
    lockStateObserver: LockStateObserver,
    chanPopulator: ChannelPopulator
  ) {
    super(logger)
    this.poller = new Poller(logger)
    this.lockStateObserver = lockStateObserver
    this.chanPopulator = chanPopulator
  }

  public start = async (): Promise<void> => {
    this.isRunning = true

    const startPoller = () => this.poller.start(
      VirtualChannelsController.INTERVAL_LENGTH,
      this.populateChannels
    )

    this.lockStateObserver.addLockHandler(() => this.poller.stop())
    this.lockStateObserver.addUnlockHandler(() => {
      if (!this.isRunning) {
        return
      }
      startPoller()
    })


    if (!this.lockStateObserver.isLocked()) {
      startPoller()
    }
  }

  public stop = async (): Promise<void> => {
    this.isRunning = false
    this.poller.stop()
  }

  private populateChannels = async (): Promise<void> => {
    await this.chanPopulator.populate()
  }
}
