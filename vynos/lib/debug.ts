import {IDebugger, default as d} from 'debug'

if (process.env.DEBUG) {
  d.enable('SpankWallet:*')
}

export default function debug(namespace: string): IDebugger {
  return d(`SpankWallet:${namespace}`)
}
