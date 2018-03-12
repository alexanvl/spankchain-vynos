import {VynosWindow} from '../vynos/window'
import * as BigNumber from 'bignumber.js';
import Vynos from '../vynos/inpage/Vynos'

let _window = (window as VynosWindow);

window.addEventListener("load", function () {
  if (!document.getElementById('vynos-script')) {
    throw new Error('no script found.')
  }

  let vynos = new Vynos({
    hubUrl: 'http://165.227.202.164:8080',
    authRealm: 'SpankChain',
    scriptElement: document.getElementById('vynos-script') as HTMLScriptElement,
    window: _window
  })

  vynos.init().catch(console.error.bind(console))

  let displayButton = document.getElementById('display')
  if (displayButton) {
    displayButton.onclick = () => {
      vynos.show()
    }
  }

  const authButton = document.getElementById('auth')
  if (authButton) {
    authButton.onclick = () => {
      vynos.setupAndLogin().then((res: { token: string }) => {
        console.log(res)
      })
    }
  }

  const tipButton = document.getElementById('tip')
  if (tipButton) {
    tipButton.onclick = () => {
      vynos.buy(new BigNumber.BigNumber(1000000000000000), {
        streamId: 'abc-123',
        streamName: 'SpankCam',
        performerId: 'abc-234',
        performerName: 'Butter Bubble'
      })
    }
  }

  const eventLog = document.getElementById('event-log')!
  subToEvent('error')
  subToEvent('ready')
  subToEvent('didOnboard')
  subToEvent('didAuthenticate')
  subToEvent('didLock')
  subToEvent('didUnlock')
  subToEvent('didShow')
  subToEvent('didHide')
  subToEvent('didBuy')

  function subToEvent (name: string) {
    vynos.on(name, (data) => {
      const node = document.createDocumentFragment()
      const dl = document.createElement('dl')
      dl.textContent = name
      const dt = document.createElement('dt')
      dt.textContent = JSON.stringify(data)
      node.appendChild(dl)
      node.appendChild(dt)
      eventLog.appendChild(node)
    })
  }
})
