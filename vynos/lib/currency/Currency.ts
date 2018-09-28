import * as BigNumber from 'bignumber.js'
import {CurrencyType} from '../../worker/WorkerState'
import BN = require('bn.js')

export interface CurrencyFormatOptions {
  decimals?: number
  withSymbol?: boolean
  showTrailingZeros?: boolean
}

export interface ICurrency {
  type: CurrencyType
  amount: string
}

export default class Currency implements ICurrency {
  static typeToSymbol: {[key: string]: string} = {
    [CurrencyType.USD]: '$',
    [CurrencyType.ETH]: 'ETH',
    [CurrencyType.WEI]: 'WEI',
    [CurrencyType.FINNEY]: 'FIN',
    [CurrencyType.BOOTY]: 'BOO',
    [CurrencyType.BEI]: 'BEI',
  }

  static ETH = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.ETH, amount)
  static USD = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.USD, amount)
  static WEI = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.WEI, amount)
  static FIN = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.FINNEY, amount)
  // static SPANK = (amount: BN|BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.SPANK, amount)
  static BOOTY = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.BOOTY, amount)
  static BEI = (amount: BN|BigNumber.BigNumber|string|number) => new Currency(CurrencyType.BEI, amount)

  static _defaultOptions = {
    [CurrencyType.USD]: {
      decimals: 2,
      withSymbol: true,
      showTrailingZeros: true,
    } as CurrencyFormatOptions,
    [CurrencyType.ETH]: {
      decimals: 3,
      withSymbol: true,
      showTrailingZeros: true,
    } as CurrencyFormatOptions,
    [CurrencyType.WEI]: {
      decimals: 0,
      withSymbol: true,
      showTrailingZeros: false,
    } as CurrencyFormatOptions,
    [CurrencyType.FINNEY]: {
      decimals: 0,
      withSymbol: true,
      showTrailingZeros: false,
    } as CurrencyFormatOptions,
    [CurrencyType.BOOTY]: {
      decimals: 0,
      withSymbol: true,
      showTrailingZeros: false,
    } as CurrencyFormatOptions,
    [CurrencyType.BEI]: {
      decimals: 0,
      withSymbol: true,
      showTrailingZeros: false,
    } as CurrencyFormatOptions,
  }

  private _type: CurrencyType
  private _amount: BigNumber.BigNumber
  private _amountBN?: BN
  
  constructor(_type: CurrencyType, _amount: BigNumber.BigNumber|string|number|BN) {
    this._type = _type

    try {
      if (_amount instanceof BigNumber) {
        this._amount = _amount
      } else if (_amount instanceof BN) {
        this._amount = new BigNumber(_amount.toString(10))
        this._amountBN = _amount
      } else { // string or number
        this._amount = new BigNumber(_amount)
      }
    } catch(e) {
      throw new Error(`Invalid amount: ${_amount} amount must be BigNumber, string, number or BN (original error: ${e}`)
    }
  }

  get type(): CurrencyType {
    return this._type
  }

  get symbol(): string {
    return Currency.typeToSymbol[this._type] as string
  }

  get currency(): ICurrency {
    return {
      amount: this.amount,
      type: this.type,
    }
  }

  get amount(): string {
    return this._amountBN ? this._amountBN.toString(10) : this._amount.toString(10)
  }

  get amountBigNumber(): BigNumber.BigNumber {
    return this._amount
  }

  get amountBN(): BN {
    return this._amountBN || new BN(this._amount.round(0).toString(10))
  }

  public getDecimalString = (decimals: number) => this.format({
    decimals,
    showTrailingZeros: true,
    withSymbol: false,
  })

  public format = (options?: CurrencyFormatOptions): string => {
    options = {
      ...Currency._defaultOptions[this._type],
      ...options || {},
    }

    const symbol = options.withSymbol ? `${this.symbol}` : ``
    const amount = options.decimals === undefined
      ? this._amount.toString(10)
      : this._amount.toNumber().toFixed(options.decimals)

    return `${symbol}${amount}`
  }
}
