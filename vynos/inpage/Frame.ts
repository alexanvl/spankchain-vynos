const FRAME_HEIGHT = 440
const FRAME_WIDTH = 480
const CLOSE_HEIGHT = 0
const CLOSE_WIDTH = 130 // %

const imgUpArrow = require('../frame/styles/images/up-arrow.svg')

export default class Frame {
  element: HTMLIFrameElement
  containerElement: HTMLDivElement
  coverElement: HTMLDivElement
  style: HTMLStyleElement
  vynosScriptAddress: string
  notifications: HTMLDivElement

  constructor(scriptAddress: string, frameElement?: HTMLIFrameElement) {
    this.vynosScriptAddress = scriptAddress
    let srcCloseButton = this.vynosScriptAddress.replace(/vynos(.|.dev.)js/, imgUpArrow)

    if (frameElement) {
      this.element = frameElement
    } else {
      this.containerElement = document.createElement('div')
      this.coverElement = document.createElement('div')
      this.element = document.createElement('iframe')
      this.element.id = 'ynos_frame'

      this.coverElement.style.position = 'fixed'
      this.coverElement.style.width = '100vw'
      this.coverElement.style.height = '100vh'
      this.coverElement.style.backgroundColor = 'rgba(0, 0, 0, .5)'
      this.coverElement.style.top = '0'
      this.coverElement.style.left = '0'
      this.coverElement.style.zIndex = '100'
      this.coverElement.style.transition = 'opacity 500ms'


      this.coverElement.addEventListener('click', () => {
        const url = window.location != window.parent.location
          ? document.referrer
          : document.location.href

        window.parent.postMessage({
          type: 'vynos/parent/hide'
        }, getDomain(url))

        function getDomain(url: string) {
          const a = document.createElement('a')
          a.setAttribute('href', url)
          return (a as any).origin
        }
      })

      let style = '#vynos_frame_img_close_button{width: 40px;bottom: 3px;position: absolute;left: 50%;margin-left: -20px;opacity:0;transition: opacity 1s}' +
        '#vynos_frame_close_button:hover > #vynos_frame_img_close_button{opacity: 1}'
      this.style = document.createElement('style')
      this.style.appendChild(document.createTextNode(style))

      this.notifications = document.createElement('div')
      this.notifications.id = 'vynos_notifications'
      this.notifications.style.marginTop = '25px'

      this.containerElement.appendChild(this.coverElement)
      this.containerElement.appendChild(this.element)
      this.containerElement.appendChild(this.style)
      this.containerElement.appendChild(this.notifications)


      this.setWalletCard()
      this.hide()
    }
    let frameSrc = this.vynosScriptAddress.replace(/vynos.js/, 'frame.html')
    this.element.src = window.location.href.match(/dev=true/) ? frameSrc + '?dev=true' : frameSrc
    this.element.setAttribute('sandbox', 'allow-scripts allow-modals allow-same-origin allow-popups allow-forms')
  }

  setWalletCard() {
    // Set iframe styles
    this.element.style.borderWidth = '0px'
    this.element.height = '100%'
    this.element.width = '100%'
    this.element.style.borderBottomLeftRadius = '10px'
    this.element.style.borderBottomRightRadius = '10px'
    this.element.style.boxShadow = '0 8px 8px 0 rgba(0, 0, 0, 0.16)'
    this.element.style.transition = 'opacity 1s'
    this.element.style.position = 'relative'
    this.element.style.zIndex = '200'
    // Set container styles
    this.containerElement.style.position = 'fixed'
    this.containerElement.style.top = '0px'
    this.containerElement.style.right = '0'
    this.containerElement.style.left = '0'
    this.containerElement.style.width = FRAME_WIDTH + 'px'
    this.containerElement.style.height = ''
    this.containerElement.style.zIndex = '9999999'
    this.containerElement.style.marginRight = 'auto'
    this.containerElement.style.marginLeft = 'auto'
    this.containerElement.style.transition = 'margin-top 0.7s'
  }

  setFullPage() {
    // Set iframe styles
    this.element.style.borderWidth = '0px'
    this.element.height = '100%'
    this.element.width = '100%'
    this.element.style.borderBottomLeftRadius = '0'
    this.element.style.borderBottomRightRadius = '0'
    this.element.style.boxShadow = 'none'
    this.element.style.transition = 'none'
    this.element.style.opacity = '1'
    this.element.style.position = 'relative'
    this.element.style.zIndex = '200'
    // Set container styles
    this.containerElement.style.position = 'fixed'
    this.containerElement.style.top = '0px'
    this.containerElement.style.right = '0'
    this.containerElement.style.left = '0'
    this.containerElement.style.width = '100vw'
    this.containerElement.style.height = '100vh'
    this.containerElement.style.zIndex = '9999999'
    this.containerElement.style.marginRight = 'auto'
    this.containerElement.style.marginLeft = 'auto'
    this.containerElement.style.transition = 'none'
    this.containerElement.style.marginTop = '0px'
  }

  attach(document: HTMLDocument) {
    if (this.containerElement && !this.containerElement.parentElement) {
      document.body.insertBefore(this.containerElement, document.body.firstChild)
    } else if (!this.element.parentElement) {
      document.body.insertBefore(this.containerElement, document.body.firstChild)
    }
  }

  setContainerStyle(containerStyle: CSSStyleDeclaration) {
    if (containerStyle.right) this.containerElement.style.right = containerStyle.right
    if (containerStyle.top) this.containerElement.style.top = containerStyle.top
    if (containerStyle.left) this.containerElement.style.left = containerStyle.left
    if (containerStyle.bottom) this.containerElement.style.bottom = containerStyle.bottom
  }

  displayFull() {
    this.setFullPage()
    this.element.style.opacity = '1'
    this.containerElement.style.marginTop = '0px'
  }

  display() {
    const ctx = this
    this.setWalletCard()
    this.element.style.opacity = '1'
    this.containerElement.style.marginTop = '0px'
    this.containerElement.appendChild(this.coverElement)
    setTimeout(() => {
      ctx.coverElement.style.opacity = '1'
    }, 16)
  }

  hideFull() {
    const ctx = this
    this.setFullPage()
    this.containerElement.style.marginTop = '-100vh'
    this.element.style.opacity = '0'
    this.coverElement.style.opacity = '0'

    setTimeout(() => {
      ctx.containerElement.removeChild(this.coverElement)
    }, 500)
  }

  hide() {
    const ctx = this
    this.setWalletCard()
    this.containerElement.style.marginTop = '-500px'
    this.element.style.opacity = '0'
    this.coverElement.style.opacity = '0'

    setTimeout(() => {
      ctx.containerElement.removeChild(this.coverElement)
    }, 500)
  }
}
