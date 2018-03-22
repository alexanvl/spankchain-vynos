import {asServiceWorker} from './worker/window'
import * as redux from 'redux'
import {Store} from 'redux'
import {RegisterHubRequest, StatusRequest} from './lib/rpc/yns'
import StartupController from './worker/controllers/StartupController'
import WorkerServer from './lib/rpc/WorkerServer'
import {autoRehydrate, persistStore} from 'redux-persist'
import reducers from './worker/reducers'
import {INITIAL_STATE, WorkerState} from './worker/WorkerState'
import {ErrResCallback} from './lib/messaging/JsonRpcServer'
import {ReadyBroadcastEvent} from './lib/rpc/ReadyBroadcast'
import {WorkerStatus} from './lib/rpc/WorkerStatus'
import WorkerWrapper from './worker/OnMessageWrapper'
import BackgroundController from './worker/controllers/BackgroundController'
import FrameController from './worker/controllers/FrameController'
import HubController from './worker/controllers/HubController'
import MicropaymentsController from './worker/controllers/MicropaymentsController'
import SharedStateView from './worker/SharedStateView'
import AuthController from './worker/controllers/AuthController'
import WalletController from './worker/controllers/WalletController'
import {SharedStateBroadcastEvent} from './lib/rpc/SharedStateBroadcast'
import debug from './lib/debug'
import localForage = require('localforage')

export class ClientWrapper implements WindowClient {
  private self: ServiceWorkerGlobalScope

  constructor (self: ServiceWorkerGlobalScope) {
    this.self = self
  }

  log = debug('ClientWrapper')

  isWrapper = true

  url: string = ''

  id: string = ''

  type: ClientType

  async postMessage (message: any, ...args: any[]) {
    const clients = await this.self.clients.matchAll()
    clients.forEach((client: WindowClient) => client.postMessage(message, ...args))
  }
}

asServiceWorker((self: ServiceWorkerGlobalScope) => {
  self.oninstall = event => {
    event.waitUntil(self.skipWaiting())
  }

  self.onactivate = event => {
    event.waitUntil(
      self.clients.claim()
        .catch(console.error.bind(console))
    )
  }

  async function install () {
    let status = WorkerStatus.INITIALIZING

    const workerWrapper = new WorkerWrapper(self)
    const clientWrapper = new ClientWrapper(self)

    const middleware = redux.compose(autoRehydrate())
    const store = redux.createStore(reducers, INITIAL_STATE, middleware) as Store<WorkerState>
    const startupController = new StartupController(store)
    const backgroundController = new BackgroundController(store)
    const server = new WorkerServer(backgroundController, workerWrapper, clientWrapper)

    await new Promise((resolve, reject) => {
      localForage.config({driver: localForage.INDEXEDDB})
      persistStore(store, {blacklist: ['runtime', 'shared'], storage: localForage}, (error, result) => {
        if (error) {
          return reject()
        }

        return resolve()
      })
    })

    const frameController = new FrameController(store)
    const sharedStateView = new SharedStateView(backgroundController)
    const hubController = new HubController(store, sharedStateView)
    const micropaymentsController = new MicropaymentsController(server.web3, store, sharedStateView)
    const authController = new AuthController(store, sharedStateView, server.providerOpts, frameController)
    const walletController = new WalletController(server.web3, store, sharedStateView)

    walletController.start()

    hubController.registerHandlers(server)
    micropaymentsController.registerHandlers(server)
    authController.registerHandlers(server)
    frameController.registerHandlers(server)
    walletController.registerHandlers(server)
    backgroundController.registerHandlers(server)
    backgroundController.didChangeSharedState(sharedState => server.broadcast(SharedStateBroadcastEvent, sharedState))

    server.addHandler(StatusRequest.method, (cb: ErrResCallback) => cb(null, status))
    server.addHandler(RegisterHubRequest.method, async (cb: ErrResCallback, hubUrl: string, authRealm: string) => {
      try {
        await startupController.registerHub(hubUrl, authRealm)
        server.broadcast(ReadyBroadcastEvent)
        status = WorkerStatus.READY
        cb(null, null)
      } catch (e) {
        cb(e, null)
      }
    })

    status = WorkerStatus.AWAITING_HUB
  }

  install().catch(console.error.bind(console))
})
