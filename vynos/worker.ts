const Raven = require('raven-js')

if (!process.env.DEBUG) {
  Raven.config('https://8199bca0aab84a5da6293737634dcc88@sentry.io/1212501', {
    environment: process.env.NODE_ENV,
  }).install()
}

import {asServiceWorker} from './worker/window'
import * as redux from 'redux'
import {Store} from 'redux'
import {ResetRequest, StatusRequest} from './lib/rpc/yns'
import WorkerServer from './lib/rpc/WorkerServer'
import {persistReducer, persistStore} from 'redux-persist'
import reducers from './worker/reducers'
import {INITIAL_STATE, WorkerState} from './worker/WorkerState'
import {ErrResCallback} from './lib/messaging/JsonRpcServer'
import {ReadyBroadcastEvent} from './lib/rpc/ReadyBroadcast'
import {WorkerStatus} from './lib/rpc/WorkerStatus'
import WorkerWrapper from './worker/OnMessageWrapper'
import Logger from './lib/Logger'
import BackgroundController from './worker/controllers/BackgroundController'
import FrameController from './worker/controllers/FrameController'
import HubController from './worker/controllers/HubController'
import MicropaymentsController from './worker/controllers/MicropaymentsController'
import SharedStateView from './worker/SharedStateView'
import AuthController from './worker/controllers/AuthController'
import WalletController from './worker/controllers/WalletController'
import {SharedStateBroadcastEvent} from './lib/rpc/SharedStateBroadcast'
import debug from './lib/debug'
import {ResetBroadcastEvent} from './lib/rpc/ResetBroadcast'
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

    localForage.config({driver: localForage.INDEXEDDB})

    const persistConfig = {
      key: 'persistent',
      whitelist: ['persistent'],
      storage: localForage
    }

    const store = redux.createStore(persistReducer(persistConfig, reducers), INITIAL_STATE) as Store<WorkerState>
    const backgroundController = new BackgroundController(store)
    const server = new WorkerServer(backgroundController, workerWrapper, clientWrapper)
    // this is a hack. we need to refactor the worker instantiation process using DI
    // or something to make this cleaner.
    backgroundController.setWeb3(server.web3)

    await new Promise((resolve) => persistStore(store, undefined, resolve))

    const sharedStateView = new SharedStateView(backgroundController)

    const getAddress = async () => {
      const addresses = await sharedStateView.getAccounts()
      return addresses[0]
    }

    const logger = new Logger({
      source: 'worker',
      getAddress
    })

    const frameController = new FrameController(store, logger)
    const hubController = new HubController(store, sharedStateView, logger)
    const micropaymentsController = new MicropaymentsController(server.web3, store, sharedStateView, server, logger)
    const authController = new AuthController(store, sharedStateView, server.providerOpts, frameController, logger)
    const walletController = new WalletController(server.web3, store, sharedStateView, logger)

    await walletController.start()

    hubController.registerHandlers(server)
    micropaymentsController.registerHandlers(server)
    authController.registerHandlers(server)
    frameController.registerHandlers(server)
    walletController.registerHandlers(server)
    backgroundController.registerHandlers(server)
    backgroundController.didChangeSharedState(sharedState => server.broadcast(SharedStateBroadcastEvent, sharedState))

    server.addHandler(StatusRequest.method, (cb: ErrResCallback) => cb(null, status))
    server.addHandler(ResetRequest.method, async (cb: ErrResCallback) => {
      try {
        await new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase('NeDB')
          req.onerror = reject
          // blocked is OK to resolve because we refresh the page
          // in response to the reset broadcast event
          req.onblocked = resolve
          req.onsuccess = resolve
        })

        await localForage.clear()

        server.broadcast(ResetBroadcastEvent)
        cb(null, null)
      } catch (e) {
        cb(e, null)
      }
    })

    await hubController.start()

    status = WorkerStatus.READY
    server.broadcast(ReadyBroadcastEvent)
  }

  install()
    .catch(error => {
      Raven.captureException(error)
      console.error(error)
    })

})
