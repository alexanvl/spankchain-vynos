import wait from './wait'

export type RetryFunc<T> = (done: DoneFunc) => Promise<T>
export type DoneFunc = () => void

/*
 * withRetries(f, retries, retryInterval will run f up to retries times
 * and return whenever f successfully returns without an error thrown.
 */
export default async function withRetries<T>(f: RetryFunc<T>, retries: number = 10, retryInterval: number = 5000): Promise<T> {
  let attempt = 1
  let done = false

  const doneFunc = () => {
    done = true
  }

  while (attempt <= retries) {
    let res = await f(doneFunc)

    if (done) {
      return res
    }

    attempt++
    if (attempt < retries) {
      await wait(retryInterval)
    }
  }
  throw new Error('Reached maximum retries.')
}
