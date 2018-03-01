import {asServiceWorker} from './worker/window'
import ServiceWorkerStream from './lib/ServiceWorkerStream'
import StartupController from './worker/controllers/StartupController'

asServiceWorker((self: ServiceWorkerGlobalScope) => {
  const stream = new ServiceWorkerStream({
    sourceName: 'worker',
    targetName: 'frame',
    source: self
  })

  const startupController = new StartupController(stream)

  self.oninstall = event => {
    event.waitUntil(startupController.start())
  }

  self.onactivate = event => {
    event.waitUntil(self.clients.claim())
  }
})
