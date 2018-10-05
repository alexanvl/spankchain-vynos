import Web3 = require('web3')
import BaseMigration from './Migration'
import Currency from '../lib/currency/Currency'
import DepositTransaction from '../lib/transactions/DepositTransaction'
import getTokenBalance from '../lib/web3/getTokenBalance'
import getETHBalance from '../lib/web3/getETHBalance'
import Logger from '../lib/Logger'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE} from '../lib/constants'
import { IConnext } from '../lib/connext/ConnextTypes';

const GAS_PLUS_RESERVE = OPEN_CHANNEL_COST.add(RESERVE_BALANCE)

export default class OpenChannelMigration extends BaseMigration {
  private erc20Address = process.env.BOOTY_CONTRACT_ADDRESS!
  private depositTx: DepositTransaction
  private web3: Web3
  private connext: IConnext

  constructor (
    logger: Logger,
    name: string,
    address: string,
    depositTx: DepositTransaction,
    web3: Web3,
    connext: IConnext
  ) {
    super(logger, name, address)

    this.depositTx = depositTx
    this.web3 = web3
    this.connext = connext

    // change the name it is stored under in indexdb
    this.depositTx.changeDepositTransactionName('migration:deposit')
  }

  async execute (): Promise<void> {
    if (await this.hasOpenChannel()) {
      return
    }

    if (this.depositTx.isInProgress()) {
      await this.depositTx.restartTransaction()
      return
    }

    const ethDepositWEI = await this.getEthDeposit()
    const tokenDepositBEI = await getTokenBalance(this.web3, this.address)

    return this.depositTx.startTransaction({
      tokenDeposit: tokenDepositBEI,
      ethDeposit: ethDepositWEI
    })
  }

  private async getEthDeposit () {
    const balance = await getETHBalance(this.address, this.web3)

    if (GAS_PLUS_RESERVE.gt(balance.amountBN)) {
      return Currency.WEI(0)
    }

    return Currency.WEI(
      balance
        .amountBN
        .sub(GAS_PLUS_RESERVE)
    )
  }

  private async hasOpenChannel () {
    const channel = await this.connext.getChannelByPartyA()
    return !!channel
  }
}
