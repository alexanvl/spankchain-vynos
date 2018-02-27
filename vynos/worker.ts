import { asServiceWorker } from './worker/window'
import BackgroundController from "./worker/controllers/BackgroundController";
import StreamServer from "./lib/StreamServer";
import ServiceWorkerStream from "./lib/ServiceWorkerStream";
import BackgroundHandler from "./worker/controllers/BackgroundHandler";
import NetworkController from "./worker/controllers/NetworkController";
import MicropaymentsHandler from "./worker/controllers/MicropaymentsHandler";
import MicropaymentsController from "./worker/controllers/MicropaymentsController";
import TransactionService from "./worker/TransactionService";
import HubController from './worker/controllers/HubController'
import HubHandler from './worker/controllers/HubHandler'
import ProviderOptions from './worker/controllers/ProviderOptions'
import AuthController from './worker/controllers/AuthController'
import FrameController from './worker/controllers/FrameController'
import SharedStateView from './worker/SharedStateView'

asServiceWorker(self => {
  const stream = new ServiceWorkerStream({
    sourceName: "worker",
    targetName: "frame",
    source: self
  });

  const backgroundController = new BackgroundController()
  const frameController = new FrameController(backgroundController.store)
  const sharedStateView = new SharedStateView(backgroundController)
  const transactionService = new TransactionService(backgroundController.store)
  const networkController = new NetworkController(backgroundController, transactionService)
  const micropaymentsController = new MicropaymentsController(networkController, backgroundController, transactionService)
  const micropaymentsHandler = new MicropaymentsHandler(micropaymentsController)

  const providerOpts = new ProviderOptions(backgroundController, transactionService, networkController.rpcUrl).approving()
  const hubController = new HubController(backgroundController.store)
  const hubHandler = new HubHandler(hubController)

  const authController = new AuthController(backgroundController.store, sharedStateView, providerOpts, frameController)

  const background = new BackgroundHandler(backgroundController)
  const server = new StreamServer("Worker", true)
    .add(background.handler)
    .add(hubHandler.handler)
    .add(micropaymentsHandler.handler)
    .add(authController.handler)
    .add(frameController.handler)
    .add(networkController.handler)

  stream.pipe(server).pipe(stream)
  background.broadcastSharedState(stream)

  self.oninstall = event => {
    event.waitUntil(self.skipWaiting())
  }

  self.onactivate = event => {
    event.waitUntil(self.clients.claim())
  }
})
