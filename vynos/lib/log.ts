import getLogger, {SCLogger} from '@spankchain/common/src/logging.js'

export default function log(namespace: string): SCLogger {
  return getLogger('vynos-worker', namespace)
}
