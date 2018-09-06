const Raven = require('raven-js')

if (process.env.DEBUG) {
  Raven.config('https://84ca54d0f2324353bb2c26c600860bb5@sentry.io/1212475', {
    environment: process.env.NODE_ENV,
  }).install()
}

import * as React from 'react'
import * as DOM from 'react-dom'
import WorkerProxy from './WorkerProxy'
import { Store } from 'redux';
import {Provider} from 'react-redux'
import * as redux from 'redux'
import {FrameState, initialState} from './redux/FrameState'
import RemoteStoreUpdater from './lib/RemoteStoreUpdater'
import reducers from './redux/reducers'
import RootContainer from './pages/RootContainer'
import {BrowserRouter} from 'react-router-dom'


const MOUNT_POINT_ID = 'mount-point'

async function renderToMountPoint (mountPoint: HTMLElement, workerProxy: WorkerProxy) {
  const store: Store<FrameState> = process.env.DEBUG
    ? redux.createStore(reducers(workerProxy), initialState(workerProxy))
    : redux.createStore(reducers(workerProxy), initialState(workerProxy))

  const frameState = await workerProxy.getSharedState()
  let remoteStore = new RemoteStoreUpdater(workerProxy, frameState)
  remoteStore.wireToLocal(store)

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.which === 27) {
      workerProxy.toggleFrame(false)
    }
  })

  function reload () {
    const el = (
      <BrowserRouter>
        <Provider store={store}>
          <RootContainer />
        </Provider>
      </BrowserRouter>
    )

    DOM.render(el, mountPoint)
  }

  reload()
}

export default function renderApplication (document: HTMLDocument, workerProxy: WorkerProxy) {
  let mountPoint = document.getElementById(MOUNT_POINT_ID)
  if (mountPoint) {
    renderToMountPoint(mountPoint, workerProxy)
  } else {
    console.error(`Can not find mount point element #${MOUNT_POINT_ID}`)
  }
}
