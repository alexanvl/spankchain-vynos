import Logger from '../../lib/Logger'
import LockStateObserver from '../../lib/LockStateObserver'
import * as actions from '../actions'
import {Store} from 'redux'
import SharedStateView from '../SharedStateView'
import Web3 from 'web3'
import {WorkerState} from '../WorkerState'
import {OPEN_CHANNEL_COST, RESERVE_BALANCE} from '../../lib/constants'
import MicropaymentsController from './MicropaymentsController'
import Currency from '../../lib/currency/Currency'
import {LockablePoller} from '../../lib/poller/LockablePoller'
import AbstractController from './AbstractController'
import {LifecycleAware} from './LifecycleAware'
import getAddress from '../../lib/getAddress'

const tokenABI = require('human-standard-token-abi')
const abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "bestFood",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "version",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "remaining",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "_initialAmount",
        "type": "uint256"
      },
      {
        "name": "_tokenName",
        "type": "string"
      },
      {
        "name": "_decimalUnits",
        "type": "uint8"
      },
      {
        "name": "_tokenSymbol",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      },
      {
        "name": "_extraData",
        "type": "bytes"
      }
    ],
    "name": "approveAndCall",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  }
]
export default class AddressBalanceController extends  AbstractController implements LifecycleAware {
  static INTERVAL_LENGTH = 10000

  private poller: LockablePoller
  private ssv: SharedStateView
  private store: Store<WorkerState>
  private web3: Web3
  private mpc: MicropaymentsController
  private bootyContract: any

  constructor(
    ssv: SharedStateView,
    store: Store<WorkerState>,
    web3: Web3,
    mpc: MicropaymentsController,
    logger: Logger,
    lso: LockStateObserver,
  ) {
    super(logger)
    this.ssv = ssv
    this.store = store
    this.web3 = web3
    this.mpc = mpc

    this.bootyContract = new web3.eth.Contract(tokenABI, process.env.BOOTY_CONTRACT_ADDRESS)

    this.bootyContract.methods.mint

    this.poller = new LockablePoller(logger, lso)
  }

  public start = async () => {
    if (this.poller.isStarted()) {
      return
    }
    this.poller.start(
      this.updateBalances,
      AddressBalanceController.INTERVAL_LENGTH,
    )
  }

  public stop = () => this.poller.stop()

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

    console.log('tokenBalance in balanceController', tokenBalance)
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
      console.log('more eth needed')
      this.store.dispatch(actions.setMoreEthNeeded(true))
      return
    }

    const ethDeposit = Currency.WEI(
      ethBalance
        .amountBN
        .sub(RESERVE_BALANCE)
        .sub(OPEN_CHANNEL_COST)
        .toString(10)
    )
      console.log('depositing...')
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
         .call({from: getAddress(this.store)})
      return  Currency.BOOTY(amount)
    } catch(e){
      console.error('unable to get ERC20 balance', {address, e})
      return Currency.BOOTY(0)
    }
  }

  private bootySupport = (): boolean => !!this.store.getState().runtime.featureFlags.bootySupport
}
