import {VynosWindow} from '../vynos/window'
import * as BigNumber from 'bignumber.js'
import Vynos from '../vynos/inpage/Vynos'

let _window = (window as VynosWindow)

window.addEventListener('load', function () {
  if (!document.getElementById('vynos-script')) {
    throw new Error('no script found.')
  }

  let vynos = new Vynos({
    hubUrl: 'http://localhost:8080',
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
      vynos.buy(new BigNumber.BigNumber(810000000000), {
        type: 'TIP',
        fields: {
          streamId: 'abc-123',
          streamName: 'SpankCam',
          performerId: 'abc-234',
          performerName: 'Butter Bubble'
        },
        receiver: '0x0108d76118d97b88aa40167064cb242fa391effa'
      })
    }
  }

  const setNameButton = document.getElementById('set-name')
  if (setNameButton) {
    setNameButton.onclick = () => {
      vynos.setUsername('falafel')
    }
  }

  const buyButton = document.getElementById('buy')
  if (buyButton) {
    buyButton.onclick = () => {
      vynos.buy(new BigNumber.BigNumber(8100000000000), {
        type: 'PURCHASE',
        fields: {
          productName: 'Widget',
          productSku: 'WIDG-123'
        },
        receiver: '0x0108d76118d97b88aa40167064cb242fa391effa'
      })
    }
  }

  const lockButton = document.getElementById('lock')
  if (lockButton) {
    lockButton.onclick = () => vynos.lock()
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
