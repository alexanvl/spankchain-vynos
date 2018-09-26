export interface Poller {
  start: (cb: Function, intervalLength: number) => Promise<void>
  stop: () => void 
  isStarted: () => boolean
}
