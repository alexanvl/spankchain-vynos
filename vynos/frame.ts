import {register, ServiceWorkerClient} from './lib/serviceWorkerClient'
import WorkerProxy from './frame/WorkerProxy'
import FrameServer from './lib/rpc/FrameServer'
import {ReadyBroadcastEvent} from './lib/rpc/ReadyBroadcast'
import {SharedStateBroadcastEvent} from './lib/rpc/SharedStateBroadcast'
import {WorkerStatus} from './lib/rpc/WorkerStatus'
import renderApplication from './frame/renderApplication'
import * as metrics from './lib/metrics'

class Client implements ServiceWorkerClient {
  workerProxy: WorkerProxy

  frameServer: FrameServer

  private heartbeating = false

  private loaded = false

  load (serviceWorker: ServiceWorker) {
    this.pollWorker = this.pollWorker.bind(this)
    this.workerProxy = new WorkerProxy(serviceWorker)
    this.frameServer = new FrameServer('*', this.workerProxy)

    this.passEvent(ReadyBroadcastEvent)
    this.passEvent(SharedStateBroadcastEvent)

    this.pollWorker()

    metrics.setLogFunc(metrics => this.frameServer.broadcast('__METRICS__', metrics))
    this.loaded = true
  }

  async unload () {
    if (!this.loaded) {
      return
    }

    try {
      this.stopHeartbeating()
      await this.frameServer.stop()
    } catch (e) {
      console.error(e)
    }
  }

  startHeartbeating () {
    console.log('Started heartbeating.')
    this.heartbeating = true
    this.beat()
  }

  stopHeartbeating () {
    this.heartbeating = false
  }

  private async beat () {
    if (!this.heartbeating) {
      return
    }

    try {
      await this.workerProxy.status()
    } catch (e) {
    }

    setTimeout(() => this.beat(), 5000)
  }

  private passEvent (name: string) {
    this.workerProxy.addListener(name, (...args: any[]) => this.frameServer.broadcast(name, ...args))
  }

  private async pollWorker () {
    const status = await this.workerProxy.status()

    if (status !== WorkerStatus.READY) {
      await new Promise((resolve) => this.workerProxy.once(ReadyBroadcastEvent, resolve))
    }

    renderApplication(document, this.workerProxy)
    this.startHeartbeating()
  }
}

window.addEventListener('load', () => {
  let client = new Client()
  register(client)
})
