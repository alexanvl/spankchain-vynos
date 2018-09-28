import Logger from '../../lib/Logger'
import * as actions from '../actions'
import {Store} from 'redux'
import SharedStateView from '../SharedStateView'
import Web3 from 'web3'
import {WorkerState} from '../WorkerState'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE} from '../../lib/constants'
import MicropaymentsController from './MicropaymentsController'
import Currency from '../../lib/currency/Currency'
import AbstractController from './AbstractController'
import getAddress from '../../lib/getAddress'
import {BasePoller} from '../../lib/poller/BasePoller'
import {Poller} from '../../lib/poller/Poller'
import {HumanStandardToken} from '../../lib/HumanStandardToken'

const tokenABI = require('human-standard-token-abi')

export default class AddressBalanceController extends AbstractController {
  static INTERVAL_LENGTH = 10000

  private poller: Poller
  private ssv: SharedStateView
  private store: Store<WorkerState>
  private web3: Web3
  private mpc: MicropaymentsController
  private bootyContract: HumanStandardToken

  constructor(
    ssv: SharedStateView,
    store: Store<WorkerState>,
    web3: Web3,
    mpc: MicropaymentsController,
    logger: Logger
  ) {
    super(logger)
    this.ssv = ssv
    this.store = store
    this.web3 = web3
    this.mpc = mpc

    this.bootyContract = new web3.eth.Contract(tokenABI, process.env.BOOTY_CONTRACT_ADDRESS) as HumanStandardToken
    this.poller = new BasePoller(logger)
    this.bootyContract = new web3.eth.Contract(tokenABI, process.env.BOOTY_CONTRACT_ADDRESS) as HumanStandardToken

    this.poller = new BasePoller(logger)
  }

  public start = async () => {
    if (this.poller.isStarted()) {
      return
    }

    await this.poller.start(
      this.updateBalances,
      AddressBalanceController.INTERVAL_LENGTH,
    )
  }

  async stop (): Promise<void> {
    this.poller.stop()
  }

  private updateBalances = async () => {
    let address: string
    try {
      address = (await this.ssv.getAccounts())[0]
    } catch (e) {
      return console.error('Caught error getting accounts:', e)
    }

    if (!address) {
      return
    }

    const ethBalance: Currency = await this.getETHBalance(address)
    const tokenBalance: Currency = this.bootySupport()
      ? await this.getTokenBalance(address)
      : Currency.BOOTY(0)

    this.store.dispatch(actions.setaddressBalances({
      ethBalance,
      tokenBalance,
    }))

    if (
      (!this.bootySupport() || tokenBalance.amountBigNumber.eq(0)) &&
      (ethBalance.amountBN.lt(RESERVE_BALANCE) ||
      ethBalance.amountBN.sub(OPEN_CHANNEL_COST).lt(RESERVE_BALANCE))
    ) {
      return
    }

    if (this.bootySupport() && ethBalance.amountBN.lt(OPEN_CHANNEL_COST)) {
      this.store.dispatch(actions.setMoreEthNeeded(true))
      return
    }

    let ethDeposit = Currency.WEI(
      ethBalance
        .amountBN
        .sub(RESERVE_BALANCE)
        .sub(OPEN_CHANNEL_COST)
        .toString(10)
    )

    if (ethDeposit.amountBigNumber.lt(0)) {
      ethDeposit = Currency.WEI(0)
    }

    await this.mpc.deposit({
      ethDeposit: ethDeposit.amount,
      tokenDeposit: this.bootySupport()
        ? tokenBalance.amount
        : Currency.BOOTY(0).amount
    })

    this.store.dispatch(actions.setaddressBalances({
      ethBalance: await this.getETHBalance(address),
      tokenBalance: this.bootySupport()
        ? await this.getTokenBalance(address)
        : Currency.BOOTY(0),
    }))
  }

  private getETHBalance = (address: string): Promise<Currency> =>
    new Promise<Currency>((resolve, reject) =>
      this.web3.eth.getBalance(address, 'latest',
        (e: Error, balance: number) => e
          ? reject(e)
          : resolve(Currency.WEI(balance)),
      )
    )

  private getTokenBalance = async (address: string): Promise<Currency> => {
    try {
      const amount = await this.bootyContract
         .methods
         .balanceOf(address)
         .call({from: address})
      return  Currency.BOOTY(amount)
    } catch(e){
      console.error('unable to get ERC20 balance', {address, e})
      return Currency.BOOTY(0)
    }
  }

  private bootySupport = (): boolean => !!this.store.getState().runtime.featureFlags.bootySupport
}
