import {Migration} from './Migration'
import requestJson, {postJson} from '../frame/lib/request'
import {Store} from 'redux'
import {WorkerState} from '../worker/WorkerState'
import * as actions from '../worker/actions'
import CloseChannelMigration from './CloseChannelMigration'

export interface MigrationMap {
  [name: string]: Migration
}

export interface MigrationResponse {
  migrationId: number
  migrationName: string
  appliedAt: number|null
}

export interface MigrationsResponse {
  applied: MigrationResponse[]
  unapplied: MigrationResponse[]
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
        const unapplied = res.unapplied[i]
        const id = unapplied.migrationId
        const name = unapplied.migrationName
        const mig = this.migrations[name]

        if (!mig) {
          throw new Error('Unknown migration ' + name)
        }

        await mig.execute()
        await postJson<void>(url, {
          ids: [id]
        })
      }
    } finally {
      this.store.dispatch(actions.setIsMigrating(false))
    }
  }
}
