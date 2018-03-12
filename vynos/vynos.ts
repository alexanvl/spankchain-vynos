import { DevWindow, VynosWindow } from './window'
import Namespace from './inpage/Namespace'

let global = window as DevWindow & VynosWindow

const isVynosPresent = global.Vynos && global.Vynos === Namespace

if (!isVynosPresent) {
  global.Vynos = Namespace
}
