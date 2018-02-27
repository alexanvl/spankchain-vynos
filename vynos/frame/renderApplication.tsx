import * as React from 'react'
import * as DOM from 'react-dom'
import WorkerProxy from './WorkerProxy'
import {Provider, Store} from 'react-redux'

// import 'semantic-ui-css/semantic.min.css';
import {createLogger} from "redux-logger";
import * as redux from "redux";
import {FrameState, initialState} from "./redux/FrameState";
import RemoteStore from "./lib/RemoteStore";
import createHashHistory from 'history/createHashHistory';
import reducers from './redux/reducers'
import {AppContainer} from "react-hot-loader";
import RootContainer from './pages/RootContainer';
import {BrowserRouter} from 'react-router-dom'

const MOUNT_POINT_ID = 'mount-point'

async function renderToMountPoint(mountPoint: HTMLElement, workerProxy: WorkerProxy) {
  const history = createHashHistory()
  const middleware = redux.applyMiddleware(createLogger())
  let store: Store<FrameState> = redux.createStore(reducers(workerProxy), initialState(workerProxy), middleware)

  const frameState = await workerProxy.getSharedState();
  let remoteStore = new RemoteStore(workerProxy, frameState)
  remoteStore.wireToLocal(store)

  function reload () {
    const el = (
      <BrowserRouter>
        <Provider store={store}>
          <AppContainer>
            <RootContainer />
          </AppContainer>
        </Provider>
      </BrowserRouter>
    )

    DOM.render(el, mountPoint)
  }

  reload()

  let hotReload = (module as HotModule).hot
  if (hotReload) {
    hotReload.accept("./vynos/frame/pages/RootContainer.tsx", () => {
      reload()
    })
  }
}

export default function renderApplication (document: HTMLDocument, workerProxy: WorkerProxy) {
  let mountPoint = document.getElementById(MOUNT_POINT_ID)
  if (mountPoint) {
    renderToMountPoint(mountPoint, workerProxy)
  } else {
    console.error(`Can not find mount point element #${MOUNT_POINT_ID}`)
  }
}
