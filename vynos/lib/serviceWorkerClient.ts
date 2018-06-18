import {BROWSER_NOT_SUPPORTED_TEXT} from '../frame/constants'

// the below string gets replaced with the real workerRunner filename via webpack
const WORKER_FILENAME = '/workerRunner.js'

const WORKER_FILENAME_LS_KEY = 'workerFilename'

export interface ServiceWorkerClient {
  load: (serviceWorker: ServiceWorker) => void
  unload: () => Promise<void>
}

function activate (client: ServiceWorkerClient, serviceWorker: ServiceWorker) {
  if (serviceWorker.state === 'activated') {
    client.load(serviceWorker)
  }
}

function install (client: ServiceWorkerClient, registration: ServiceWorkerRegistration) {
  let serviceWorker = (registration.active || registration.installing)!

  serviceWorker.onstatechange = () => {
    if (serviceWorker.state === 'redundant') {
      client.unload().catch(console.error.bind(console))
      return
    }

    activate(client, serviceWorker)
  }

  activate(client, serviceWorker)
}

async function handleRegistration (client: ServiceWorkerClient, registration: ServiceWorkerRegistration) {
  const lastWorkerFilename = localStorage.getItem(WORKER_FILENAME_LS_KEY)

  if (lastWorkerFilename !== WORKER_FILENAME) {
    await registration.update()
  }

  await install(client, registration)
  localStorage.setItem(WORKER_FILENAME_LS_KEY, WORKER_FILENAME)
}

export function register (client: ServiceWorkerClient) {
  if (!navigator.serviceWorker) {
    throw new Error(BROWSER_NOT_SUPPORTED_TEXT)
  }

  navigator.serviceWorker.register(WORKER_FILENAME, {scope: './'})
    .then((registration) => handleRegistration(client, registration))
    .catch((error) => console.error(error))

}
