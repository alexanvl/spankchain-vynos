import wait from './wait'

/*
 * withRetries(f, retries, retryInterval will run f up to retries times
 * and return whenever f successfully returns without an error thrown.
 */
export default async function withRetries<T>(f: () => Promise<T>, retries: number = 10, retryInterval: number = 5000): Promise<T> {
  let attempt = 1

  while (attempt <= retries) {
    let res: T

    try {
      res = await f()
      return res
    } catch (e) {
      attempt++

      if (attempt < retries) {
        await wait(retryInterval)
      }
    }
  }
  throw new Error('Reached maximum retries.')
}