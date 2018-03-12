import * as redux from 'redux'
import {Store} from 'redux'
import reducers from '../reducers'
import {INITIAL_STATE, WorkerState} from '../WorkerState'
import * as actions from '../actions'
import {createLogger} from 'redux-logger'
import {autoRehydrate, persistStore} from 'redux-persist'
import {EventEmitter} from 'events'
import {BrandingResponse, default as HubController} from './HubController'
import ServiceWorkerStream from '../../lib/ServiceWorkerStream'
import {JSONRPC, RequestPayload} from '../../lib/Payload'
import {default as StreamServer, EndFunction} from '../../lib/StreamServer'
import {InitializeRequest, InitializeResponse} from '../../lib/rpc/yns'
import BackgroundHandler from './BackgroundHandler'
import AuthController from './AuthController'
import FrameController from './FrameController'
import BackgroundController from './BackgroundController'
import SharedStateView from '../SharedStateView'
import NetworkController from './NetworkController'
import HubHandler from './HubHandler'
import MicropaymentsController from './MicropaymentsController'
import MicropaymentsHandler from './MicropaymentsHandler'
import {LifecycleAware} from './LifecycleAware'
import {ReadyBroadcast, ReadyBroadcastType} from '../../lib/rpc/ReadyBroadcast'
import WalletController from './WalletController'
import localForage = require('localforage')

export default class StartupController implements LifecycleAware {
  stream: ServiceWorkerStream

  server: StreamServer

  store: Store<WorkerState>

  events: EventEmitter

  isHydrated: boolean = false

  constructor (stream: ServiceWorkerStream) {
    this.stream = stream
    this.server = new StreamServer('Worker', true)

    const middleware = redux.compose(redux.applyMiddleware(createLogger()), autoRehydrate())
    this.store = redux.createStore(reducers, INITIAL_STATE, middleware) as Store<WorkerState>
    this.events = new EventEmitter()
  }

  public async start (): Promise<void> {
    await this.hydrate()
    this.server.add(this.handler.bind(this))
    this.stream.pipe(this.server).pipe(this.stream)
  }

  public async stop (): Promise<void> {
  }

  public handler (message: RequestPayload, next: Function, end: EndFunction) {
    if (InitializeRequest.match(message)) {
      this.onInitializationRequest(message, next, end)
    } else {
      next()
    }
  }

  private async hydrate () {
    await new Promise((resolve, reject) => {
      localForage.config({driver: localForage.INDEXEDDB})
      persistStore(this.store, {blacklist: ['runtime', 'shared'], storage: localForage}, (error, result) => {
        if (error) {
          console.log(error)
          return reject()
        }

        this.isHydrated = true
        return resolve()
      })
    })
  }

  private async onInitializationRequest (message: RequestPayload, next: Function, end: EndFunction) {
    try {
      const [hubUrl, authRealm] = message.params

      this.setCurrentHubUrl(hubUrl)
      this.setAuthRealm(authRealm)
      await this.getHubBranding(hubUrl)

      await this.initializeOtherControllers()

      const response: InitializeResponse = {
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: true
      }

      end(null, response)
    } catch (e) {
      end(e)
    }
  }

  private setCurrentHubUrl (hubUrl: string) {
    this.store.dispatch(actions.setCurrentHubUrl(hubUrl))
  }

  private setAuthRealm (authRealm: string) {
    this.store.dispatch(actions.setCurrentAuthRealm(authRealm))
  }

  private async getHubBranding (hubUrl: string): Promise<null> {
    const res = await fetch(`${hubUrl}/branding`)
    const resJson: BrandingResponse = await res.json()
    this.store.dispatch(actions.setHubBranding(resJson))
    return null
  }

  private async initializeOtherControllers () {
    const backgroundController = new BackgroundController(this.store)
    const backgroundHandler = new BackgroundHandler(backgroundController)
    const frameController = new FrameController(this.store)
    const sharedStateView = new SharedStateView(backgroundController)
    const networkController = new NetworkController(backgroundController)
    const hubController = new HubController(this.store, sharedStateView)
    const hubHandler = new HubHandler(hubController)
    const micropaymentsController = new MicropaymentsController(networkController.providerOpts, this.store, sharedStateView)
    const micropaymentsHandler = new MicropaymentsHandler(micropaymentsController)
    const authController = new AuthController(this.store, sharedStateView, networkController.providerOpts, frameController)
    const walletController = new WalletController(networkController, this.store, sharedStateView)

    walletController.start()

    this.server.add(backgroundHandler.handler)
      .add(hubHandler.handler)
      .add(micropaymentsHandler.handler)
      .add(authController.handler)
      .add(frameController.handler)
      .add(walletController.handler)
      .add(networkController.handler)

    const ready: ReadyBroadcast = {
      id: ReadyBroadcastType,
      jsonrpc: JSONRPC,
      result: null
    }

    this.stream.write(ready)

    backgroundHandler.broadcastSharedState(this.stream)
  }
}
