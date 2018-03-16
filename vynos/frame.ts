import {register, ServiceWorkerClient} from './lib/serviceWorkerClient'
import WorkerProxy from './frame/WorkerProxy'
import FrameServer from './lib/rpc/FrameServer'
import {ReadyBroadcastEvent} from './lib/rpc/ReadyBroadcast'
import {SharedStateBroadcastEvent} from './lib/rpc/SharedStateBroadcast'
import {WorkerStatus} from './lib/rpc/WorkerStatus'
import {WorkerReadyBroadcastEvent} from './lib/rpc/WorkerReadyBroadcast'
import renderApplication from './frame/renderApplication'

class Client implements ServiceWorkerClient {
  workerProxy: WorkerProxy

  frameServer: FrameServer

  load (serviceWorker: ServiceWorker) {
    this.pollWorker = this.pollWorker.bind(this)
    this.workerProxy = new WorkerProxy(serviceWorker)
    this.frameServer = new FrameServer('*', this.workerProxy)

    this.passEvent(ReadyBroadcastEvent)
    this.passEvent(SharedStateBroadcastEvent)

    this.pollWorker()

    this.workerProxy.once(ReadyBroadcastEvent, () => renderApplication(document, this.workerProxy))
  }

  unload () {
    this.frameServer.stop().catch(console.error.bind(console))
  }

  private passEvent (name: string) {
    this.workerProxy.addListener(name, (...args: any[]) => this.frameServer.broadcast(name, ...args))
  }

  private pollWorker () {
    const poll = async () => {
      const maxAttempts = 10
      let attempt = 0
      let status = WorkerStatus.INITIALIZING

      while (status === WorkerStatus.INITIALIZING) {
        if (attempt === maxAttempts) {
          throw new Error('Timed out.')
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          status = await this.workerProxy.status()
        } catch (e) {
        }

        attempt++
      }

      this.frameServer.broadcast(WorkerReadyBroadcastEvent)
    }

    poll().catch(console.error.bind(console))
  }
}

window.addEventListener('load', () => {
  let client = new Client()
  register(client)
})
