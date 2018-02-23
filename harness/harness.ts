import {VynosWindow} from '../vynos/window'
import Web3 = require('web3')

let _window = (window as VynosWindow);

window.addEventListener("load", function () {
  if (!document.getElementById('vynos-script')) {
    throw new Error('no script found.')
  }

  let vynos = new _window.Vynos({
    hubUrl: 'http://165.227.202.164:8080',
    authRealm: 'bar',
    scriptElement: document.getElementById('vynos-script') as HTMLScriptElement,
    window: _window
  })


  let customFrame = document.getElementById('custom_frame')
  if (customFrame) {
    vynos.init(customFrame as HTMLIFrameElement)
  }

  vynos.ready().then(instance => {
    let provider = instance.provider
    let web3 = new Web3(provider)
    web3.eth.getAccounts((err, accounts) => {
      console.log(accounts)
    })
  })

  let displayButton = document.getElementById('display')
  if (displayButton) {
    displayButton.onclick = () => {
      vynos.display()
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
})

