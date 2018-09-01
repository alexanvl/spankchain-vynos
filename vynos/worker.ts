import ProviderOptions from './worker/controllers/ProviderOptions'

const Raven = require('raven-js')

if (!process.env.DEBUG) {
  Raven.config('https://8199bca0aab84a5da6293737634dcc88@sentry.io/1212501', {
    environment: process.env.NODE_ENV,
  }).install()
}

import {asServiceWorker} from './worker/window'
import * as redux from 'redux'
import {Store} from 'redux'
import {createLogger} from 'redux-logger'
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
import VirtualChannelsController from './worker/controllers/VirtualChannelsController'
import LockStateObserver from './lib/LockStateObserver'
import {SharedStateBroadcastEvent} from './lib/rpc/SharedStateBroadcast'
import debug from './lib/debug'
import {ResetBroadcastEvent} from './lib/rpc/ResetBroadcast'
import localForage = require('localforage')
import ClientProvider from './lib/web3/ClientProvider'
import Web3 = require('web3')
import Connext = require('connext')
import ChannelPopulator from './lib/ChannelPopulator'
import BalanceController from './worker/controllers/BalanceController'
import WithdrawalController from './worker/controllers/WithdrawalController'
import * as actions from './worker/actions'

export class ClientWrapper implements WindowClient {
  private self: ServiceWorkerGlobalScope

  constructor (self: ServiceWorkerGlobalScope) {
    this.self = self
  }

  log = debug('ClientWrapper')

  isWrapper = true

  url: string = ''

  id: string = ''

  type: ClientType = 'worker'

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

    const reduxMiddleware = process.env.NODE_ENV === 'development' && process.env.DEBUG
      ? redux.applyMiddleware(createLogger())
      : undefined

    const store = redux.createStore(persistReducer(persistConfig, reducers), INITIAL_STATE, reduxMiddleware) as Store<WorkerState>
    
    const isPersistedStatePreMigration = !!store.getState().persistent.transactions
    if (isPersistedStatePreMigration) {
      store.dispatch(actions.setInitialState(null))
    }

    const providerOpts = new ProviderOptions(store).approving() as any
    const provider = ClientProvider(providerOpts)
    const web3 = new Web3(provider) as any
    const server = new WorkerServer(provider, workerWrapper, clientWrapper)

    const connext = new Connext({
      web3: web3,
      ingridAddress: '0xbb1699d16368ebc13bdc29e6a1aad50a21be45eb',
      watcherUrl: process.env.HUB_URL!,
      ingridUrl: process.env.HUB_URL!,
      contractAddress: '0x0010822efcbbea5ceabf1b180bc9c73c6dfffbb0'
    })

    await new Promise((resolve) => persistStore(store, undefined, resolve))

    const sharedStateView = new SharedStateView(store)

    const getAddress = async () => {
      const addresses = await sharedStateView.getAccounts()
      return addresses[0]
    }
    const logger = new Logger({
      source: 'worker',
      getAddress
    })

    const chanPopulator = new ChannelPopulator(connext, store)
    const lockStateObserver = new LockStateObserver(store)
    const backgroundController = new BackgroundController(store, web3, logger)
    const frameController = new FrameController(store, logger)
    const hubController = new HubController(store, sharedStateView, logger)
    const micropaymentsController = new MicropaymentsController(web3, store, logger, connext, lockStateObserver, chanPopulator)
    const authController = new AuthController(store, backgroundController, sharedStateView, providerOpts, frameController, logger)
    const walletController = new WalletController(web3, store, sharedStateView, logger)
    const virtualChannelsController = new VirtualChannelsController(logger, lockStateObserver, chanPopulator)
    const balanceController = new BalanceController(logger, lockStateObserver, sharedStateView, store, web3, micropaymentsController)
    const withdrawalController = new WithdrawalController(logger, connext, web3, store, lockStateObserver, chanPopulator)

    await balanceController.start()
    await virtualChannelsController.start()

    hubController.registerHandlers(server)
    micropaymentsController.registerHandlers(server)
    authController.registerHandlers(server)
    frameController.registerHandlers(server)
    walletController.registerHandlers(server)
    backgroundController.registerHandlers(server)
    withdrawalController.registerHandlers(server)
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
