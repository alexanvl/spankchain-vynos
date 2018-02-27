import {EventEmitter} from 'events'

export default class WildcardEventEmitter extends EventEmitter {
  emit(event: string | symbol, ...args: any[]): boolean {

  }
}
