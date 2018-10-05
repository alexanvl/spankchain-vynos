import {Migration} from './Migration'
import requestJson, {postJson} from '../frame/lib/request'
import {Store} from 'redux'
import {WorkerState} from '../worker/WorkerState'
import * as actions from '../worker/actions'
import CloseChannelMigration from './CloseChannelMigration'
import getETHBalance from '../lib/web3/getETHBalance'
import Web3 = require('web3')
import {ZERO} from '../lib/constants'
import {BasePoller} from '../lib/poller/BasePoller'
import Logger from '../lib/Logger'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE} from '../lib/constants'

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
  private web3: Web3
  private logger: Logger

  constructor (store: Store<WorkerState>, migrations: MigrationMap, address: string, web3: Web3, logger: Logger) {
    this.store = store
    this.migrations = migrations
    this.address = address
    this.web3 = web3
    this.logger = logger
  }

  async catchUp (): Promise<void> {
    const url = `${process.env.HUB_URL}/accounts/${this.address}/migrations`
    const res = await requestJson<MigrationsResponse>(url)

    if (!res.unapplied.length) {
      return
    }

    const bal = await getETHBalance(this.address, this.web3)
    if (bal.amountBN.eq(ZERO)) {
      this.store.dispatch(actions.setMigrationState({ state: 'AWAITING_ETH' }))
      await this.hasEth()
    }

    this.store.dispatch(actions.setMigrationState({
      state: 'MIGRATING',
      currentMigration: { unapplied: res.unapplied },
    }))
    let lastMigration
    try {
      for (let i = 0; i < res.unapplied.length; i++) {
        const unapplied = res.unapplied[i]
        console.log('Applying migration:', unapplied)
        lastMigration = unapplied
        this.store.dispatch(actions.setMigrationState({
          state: 'MIGRATING',
          currentMigration: unapplied,
        }))
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
    } catch (e) {
      console.error('Error applying migration:', lastMigration)
      console.error(e)
      
      this.store.dispatch(actions.setMigrationState({ state: 'MIGRATION_FAILED' }))

      throw e
    } 
    this.store.dispatch(actions.setMigrationState({ state: 'DONE' }))
  }

  private hasEth() {
    return new Promise((resolve) => {
      const poller = new BasePoller(this.logger)
      poller.start(async () => {
        const bal = await getETHBalance(this.address, this.web3)
        if (bal.amountBN.gt(OPEN_CHANNEL_COST.add(RESERVE_BALANCE))) {
          poller.stop()
          resolve()
        }
      }, 5000)
    })
  }
}
