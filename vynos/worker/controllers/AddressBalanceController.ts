import Logger from '../../lib/Logger'
import * as actions from '../actions'
import {Store} from 'redux'
import SharedStateView from '../SharedStateView'
import Web3 from 'web3'
import {WorkerState, CurrencyType} from '../WorkerState'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE, ZERO} from '../../lib/constants'
import MicropaymentsController from './MicropaymentsController'
import Currency from '../../lib/currency/Currency'
import AbstractController from './AbstractController'
import {BasePoller} from '../../lib/poller/BasePoller'
import {Poller} from '../../lib/poller/Poller'
import {HumanStandardToken} from '../../lib/HumanStandardToken'
import CurrencyConvertable from '../../lib/currency/CurrencyConvertable';

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

  private updateBalances = async (onlyUpdate = false) => {
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
    const {tokenBalanceBooty, tokenBalanceBei} = await this.getTokenBalance(address)

    this.store.dispatch(actions.setaddressBalances({
      ethBalance,
      tokenBalance: tokenBalanceBooty,
    }))

    if (onlyUpdate) {
      return
    }

    if ((ethBalance.amountBN.lt(RESERVE_BALANCE) || ethBalance.amountBN.sub(OPEN_CHANNEL_COST).lt(RESERVE_BALANCE)) && tokenBalanceBei.amountBN.eq(ZERO)) {
      return
    }

    if (ethBalance.amountBN.lt(OPEN_CHANNEL_COST)) {
      this.store.dispatch(actions.setMoreEthNeeded(true))
      return
    }

    await this.deposit(ethBalance, tokenBalanceBei)
  }

  private deposit = async (ethBalanceWei: Currency, tokenBalanceBei: Currency) => {
    let ethDeposit = Currency.WEI(
      ethBalanceWei
        .amountBigNumber
        .sub(RESERVE_BALANCE.toString(10))
        .sub(OPEN_CHANNEL_COST.toString(10))
    )

    if (ethDeposit.amountBigNumber.lt(0)) {
      ethDeposit = Currency.WEI(0)
    }

    console.log(`Depositing ${ethDeposit.toString()} weiand ${tokenBalanceBei.toString()} bei`)

    await this.mpc.deposit({
      ethDeposit: ethDeposit,
      tokenDeposit: tokenBalanceBei
    })

    await this.updateBalances(true)
  }

  private getETHBalance = (address: string): Promise<Currency> =>
    new Promise<Currency>((resolve, reject) =>
      this.web3.eth.getBalance(address, 'latest',
        (e: Error, balance: number) => e
          ? reject(e)
          : resolve(Currency.WEI(balance)),
      )
    )

  private getTokenBalance = async (address: string): Promise<{tokenBalanceBooty: Currency, tokenBalanceBei: Currency}> => {
    try {
      const amount = await this.bootyContract
         .methods
         .balanceOf(address)
         .call()

      const tokenBalanceBei = new CurrencyConvertable(CurrencyType.BEI, amount, () => this.store.getState().runtime.exchangeRates!)
      const tokenBalanceBooty = tokenBalanceBei.to(CurrencyType.BOOTY)
      return  {tokenBalanceBooty: tokenBalanceBooty, tokenBalanceBei: tokenBalanceBei}
    } catch(e){
      console.error('unable to get ERC20 balance', {address, e})
      return {tokenBalanceBooty: Currency.BOOTY(0), tokenBalanceBei: Currency.BEI(0)}
    }
  }

  private bootySupport = (): boolean => !!this.store.getState().runtime.featureFlags.bootySupport
}
