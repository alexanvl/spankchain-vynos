import { BROWSER_NOT_SUPPORTED_TEXT } from '../frame/constants'

export interface ServiceWorkerClient {
  load: (serviceWorker: ServiceWorker) => void
  unload: () => Promise<void>
}

function activate(client: ServiceWorkerClient, serviceWorker: ServiceWorker) {
  console.log('my state is', serviceWorker.state);

  if (serviceWorker.state === 'activated') {
    client.load(serviceWorker)
  }
}

function install(client: ServiceWorkerClient, registration: ServiceWorkerRegistration) {
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

export function register(client: ServiceWorkerClient) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/workerRunner.js', {scope: './'})
      .then((registration) => registration.update().then(() => registration))
      .then((registration) => install(client, registration))
      .catch((error) => console.error(error))
  } else {
    throw new Error(BROWSER_NOT_SUPPORTED_TEXT)
  }
}
