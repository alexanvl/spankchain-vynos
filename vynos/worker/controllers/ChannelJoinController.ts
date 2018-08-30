import {WorkerState} from '../WorkerState'
import {Store} from 'redux'
import AbstractController from './AbstractController'
import {LifecycleAware} from './LifecycleAware'
import Logger from '../../lib/Logger'
import Poller from '../../lib/Poller'

export default class ChannelJoinController extends AbstractController implements LifecycleAware {
  private connext: any
  private store: Store<WorkerState>
  private poller: Poller
  static INTERVAL_LENGTH = 60000

  constructor(
    connext: any,
    store: Store<WorkerState>,
    logger: Logger,
  ) {
    super(logger)
    this.connext = connext
    this.store = store
    this.poller = new Poller(logger)
  }

  public async start(): Promise<void> {
    this.poller.start(
      ChannelJoinController.INTERVAL_LENGTH,
      this.pollUnjoinedChannels
    )
  }

  public async stop(): Promise<void> {
    this.poller.stop()
  }

  private pollUnjoinedChannels = async (): Promise<void> => {
    const newChannels = await this.getUnjoinedChannels()
    await this.joinChannels(newChannels)
  }

  private joinChannels = async (newChannels: number[]): Promise<void> => {
    await Promise.all(newChannels.map(this.joinChannel))
  }

  private joinChannel = async (channelId: number): Promise<void> => {
    try {
      await this.connext.joinChannel(channelId, this.getAddress())
    } catch(e) {
      console.error('connext.joinChannel failed', e)
      throw e
    }
  }

  private getUnjoinedChannels = async (): Promise<any> => {
    try {
      return await this.connext.getUnjoinedChannels(this.getAddress())
    } catch (e) {
      console.error('connext.getUnjoinedChannels failed', e)
      throw e
    }
  }

  private getAddress = (): string => {
    return this.store.getState().runtime.wallet!.getAddressString()
  }
}