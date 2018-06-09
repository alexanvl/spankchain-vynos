import {EventEmitter} from 'events'

export default class OnMessageWrapper extends EventEmitter {
  constructor (self: ServiceWorkerGlobalScope) {
    super()
    this.onMessage = this.onMessage.bind(this)
    self.addEventListener('message', this.onMessage)
  }

  public onMessage(e: any) {
    console.log('in worker got message', e);
    this.emit('message', e)
  }

  public addEventListener(name: string, cb: (e: any) => void) {
    this.addListener(name, cb)
  }

  public removeEventListener(name: string, cb: (e: any) => void) {
    this.removeListener(name, cb)
  }
}
