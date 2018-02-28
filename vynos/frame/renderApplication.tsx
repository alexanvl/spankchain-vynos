import * as React from 'react'
import * as DOM from 'react-dom'
import WorkerProxy from './WorkerProxy'
import {Provider, Store} from 'react-redux'
import {createLogger} from 'redux-logger'
import * as redux from 'redux'
import {FrameState, initialState} from './redux/FrameState'
import RemoteStore from './lib/RemoteStore'
import reducers from './redux/reducers'
import RootContainer from './pages/RootContainer'
import {BrowserRouter} from 'react-router-dom'

const MOUNT_POINT_ID = 'mount-point'

async function renderToMountPoint (mountPoint: HTMLElement, workerProxy: WorkerProxy) {
  const middleware = redux.applyMiddleware(createLogger())
  let store: Store<FrameState> = redux.createStore(reducers(workerProxy), initialState(workerProxy), middleware)

  const frameState = await workerProxy.getSharedState()
  let remoteStore = new RemoteStore(workerProxy, frameState)
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
