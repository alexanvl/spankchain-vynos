import {VynosWindow} from '../vynos/window'
import BN = require('bn.js')
import Vynos from '../vynos/inpage/Vynos'

let _window = (window as VynosWindow)

window.addEventListener('load', function () {
  if (!document.getElementById('vynos-script')) {
    throw new Error('no script found.')
  }

  let vynos = new Vynos({
    scriptElement: document.getElementById('vynos-script') as HTMLScriptElement,
    window: _window,
  })

  vynos.setMetricLogFunc((m) => console.log(`Logged metric: ${m[0].name}`, m))

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

      const receiver: string =
        (document.getElementById('reciever') as HTMLInputElement).value
        || '0x0ec05ca2d7e658259d3cd737d3f33685875c52bb'

      const tipAmountFIN: string =
        (document.getElementById('amount') as HTMLInputElement).value
        || '1'

      vynos.buy(new BN(1000000000000000).mul(new BN(tipAmountFIN)), {
        type: 'TIP',
        fields: {
          streamId: 'abc-123',
          streamName: 'SpankCam',
          performerId: 'abc-234',
          performerName: 'Butter Bubble',
          tipperName: 'They call me Harness',
        },
        receiver,
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
      vynos.buy(new BN(8100000000000), {
        type: 'PURCHASE',
        fields: {
          productName: 'Widget',
          productSku: 'WIDG-123'
        },
        receiver: '0x0ec05ca2d7e658259d3cd737d3f33685875c52bb'
      })
    }
  }

  const buyVideoButton = document.getElementById('buy-video')
  if (buyVideoButton) {
    buyVideoButton.onclick = () => {
      vynos.buy(new BN(8100000000000), {
        type: 'PURCHASE',
        fields: {
          productName: 'Pop Music Video',
          productSku: 'NA-123-POP'
        },
        receiver: '0x0ec05ca2d7e658259d3cd737d3f33685875c52bb'
      })
    }
  }

  const lockButton = document.getElementById('lock')
  if (lockButton) {
    lockButton.onclick = () => vynos.lock()
  }

  const hideChannels = document.getElementById('hide-channels')
  if (hideChannels) {
    hideChannels.onclick = () => {
      document.getElementById('channels')!.innerText = ''
    }
  }

  const hideState = document.getElementById('hide-state')
  if (hideState) {
    hideState.onclick = () => {
      document.getElementById('shared-state')!.innerText = ''
    }
  }

  const refreshChannelsButton = document.getElementById('refresh-channels')
  if (refreshChannelsButton) {
    refreshChannelsButton.onclick = () => 
      vynos
        .getBalance()
        .then((balance: any) => 
          document.getElementById('channels')!.innerText = JSON.stringify(balance, null, 2)
        )
  }

  const showEntireSharedState = document.getElementById('refresh-shared-state')
  if (showEntireSharedState) {
    showEntireSharedState.onclick = () => 
      vynos
        .getSharedState()
        .then((state: any) => 
          document.getElementById('shared-state')!.innerText = JSON.stringify(state, null, 2)
        )
  }

  const performerMode = document.getElementById('performer-mode') as HTMLInputElement
  if (performerMode) {
    performerMode.onchange = () => {
      vynos.setNeedsCollateral(performerMode.checked)
        .catch(console.error.bind(console))
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
