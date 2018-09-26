import BigNumber from 'bignumber.js'
import {CurrencyType} from '../worker/WorkerState';
import BN = require('bn.js')

export interface CurrencyFormatOptions {
  decimals?: number
  withSymbol?: boolean
  showTrailingZeros?: boolean
}

export interface ICurrency<ThisType extends CurrencyType=any> {
  type: CurrencyType
  amount: string
}

type CmpType = 'lt' | 'lte' | 'gt' | 'gte' | 'eq'

export default class Currency<ThisType extends CurrencyType=any> implements ICurrency<ThisType> {
  static typeToSymbol: {[key: string]: string} = {
    [CurrencyType.USD]: '$',
    [CurrencyType.ETH]: 'ETH',
    [CurrencyType.WEI]: 'WEI',
    [CurrencyType.FINNEY]: 'FIN',
    [CurrencyType.BOOTY]: 'BOO',
  }

  static ETH = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.ETH, amount)
  static USD = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.USD, amount)
  static WEI = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.WEI, amount)
  static FIN = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.FINNEY, amount)
  // static SPANK = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.SPANK, amount)
  // static BOOTY = (amount: BigNumber.BigNumber|string|number): Currency => new Currency(CurrencyType.BOOTY, amount)

  private _type: ThisType
  private _amount: BigNumber.BigNumber
  private _defaultOptions = {
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
  }

  constructor(_type: ThisType, _amount: BigNumber.BigNumber|string|number) {
    if (typeof _amount === 'string' || typeof _amount === 'number') {
      try {
        _amount = new BigNumber(_amount)
      } catch(e) {
        throw new Error(`Invalid amount: ${_amount} (original error: ${e}`)
      }
    }

    this._type = _type
    this._amount = _amount
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
    return this._amount.toString(10)
  }

  get amountBigNumber(): BigNumber.BigNumber {
    return this._amount
  }

  get amountBN(): BN {
    return new BN(this._amount.round(0).toString(10))
  }

  public getDecimalString = (decimals: number) => this.format({
    decimals,
    showTrailingZeros: true,
    withSymbol: false,
  })

  public format = (_options?: CurrencyFormatOptions): string => {
    const options: CurrencyFormatOptions = {
      ...this._defaultOptions[this._type] as any,
      ..._options || {},
    }

    const symbol = options.withSymbol ? `${this.symbol}` : ``
    const amount = options.decimals === undefined
      ? this._amount.toString(10)
      : this._amount.toNumber().toFixed(options.decimals)

    return `${symbol}${amount}`
  }

  public compare(cmp: CmpType, b: Currency<ThisType>|string, bType?: CurrencyType): boolean {
    if (typeof b == 'string')
      b = new Currency(bType || this._type, b) as Currency<ThisType>

    if (this.type != b.type) {
      throw new Error(
        `Cannot compare incompatible currency types ${this.type} and ${b.type} ` +
        `(amounts: ${this.amount}, ${b.amount})`
      )
    }

    return this.amountBigNumber[cmp](b.amountBigNumber)
  }

}
