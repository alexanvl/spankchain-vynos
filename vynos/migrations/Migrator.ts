import {Migration} from './Migration'
import requestJson, {postJson} from '../frame/lib/request'
import {Store} from 'redux'
import {WorkerState} from '../worker/WorkerState'
import * as actions from '../worker/actions'

export interface MigrationMap {
  [name: string]: Migration
}

export interface MigrationsResponse {
  applied: string[]
  unapplied: string[]
}

export default class Migrator {
  private store: Store<WorkerState>
  private migrations: MigrationMap
  private address: string

  constructor (store: Store<WorkerState>, migrations: MigrationMap, address: string) {
    this.store = store
    this.migrations = migrations
    this.address = address
  }

  async catchUp (): Promise<void> {
    const url = `${process.env.HUB_URL}/accounts/${this.address}/migrations`
    const res = await requestJson<MigrationsResponse>(url)

    if (!res.unapplied.length) {
      return
    }

    this.store.dispatch(actions.setIsMigrating(true))
    try {
      for (let i = 0; i < res.unapplied.length; i++) {
        const name = res.unapplied[i]
        const mig = this.migrations[name]

        if (!mig) {
          throw new Error('Unknown migration ' + name)
        }

        await mig.execute()
        await postJson<void>(url, {
          migrationName: name
        })
      }
    } finally {
      this.store.dispatch(actions.setIsMigrating(false))
    }
  }
}
