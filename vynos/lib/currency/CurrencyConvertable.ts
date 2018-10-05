import BigNumber from 'bignumber.js'
import {WorkerState, ExchangeRates, CurrencyType} from '../../worker/WorkerState'
import Currency from './Currency'
import {Store} from 'redux'
import BN = require('bn.js')
import {BOOTY} from '../constants';

export type AllConversions = {[key in CurrencyType]: CurrencyConvertable}

export default class CurrencyConvertable extends Currency {
  static getExchangeRatesWorker = (store: Store<WorkerState>) => () => store.getState().runtime.exchangeRates!

  protected exchangeRates: () => ExchangeRates

  constructor(type: CurrencyType, amount: BN|BigNumber.BigNumber|string|number, exchangeRates: () => ExchangeRates) {
    super(type, amount)
    this.exchangeRates = () => {
      const rates = exchangeRates()
      if (!rates) {
        throw new Error('exchange rates not set!')
      }
      return rates
    }
  }

  public to = (toType: CurrencyType): CurrencyConvertable => this._convert(toType)
  public toAll = (): AllConversions =>
    Object.keys(Currency.typeToSymbol)
      .map(type => this._convert(type as CurrencyType))
      .reduce((a, currency) => ({...a, [currency.type]: currency}), {} as AllConversions)
  public toUSD = (): CurrencyConvertable => this._convert(CurrencyType.USD)
  public toETH = (): CurrencyConvertable => this._convert(CurrencyType.ETH)
  public toWEI = (): CurrencyConvertable => this._convert(CurrencyType.WEI)
  public toFIN = (): CurrencyConvertable => this._convert(CurrencyType.FINNEY)
  // public toSPANK = (): CurrencyConvertable => this._convert(CurrencyType.SPANK)
  public toBOOTY = (): CurrencyConvertable => this._convert(CurrencyType.BOOTY)
  public toBEI = (): CurrencyConvertable => this._convert(CurrencyType.BEI)

  private _convert = (toType: CurrencyType): CurrencyConvertable => {
    if (this.type === toType) {
      return this
    }

    // guaranteeing precision until more tests are written
    // since exchange rates are based on WEI and BN and BIgNumber are mixed 
    // more testing should be done specifically with BEI to BOOTY converstions
    if (this.type === CurrencyType.BEI && toType === CurrencyType.BOOTY) {
      return new CurrencyConvertable(
        toType,
        this.amountBigNumber.div(BOOTY.amount),
        this.exchangeRates,
      )
    }

    if (this.type === CurrencyType.BOOTY && toType === CurrencyType.BEI) {
      return new CurrencyConvertable(
        toType,
        this.amountBigNumber.mul(BOOTY.amount),
        this.exchangeRates,
      )
    }

    const rates: ExchangeRates = this.exchangeRates()

    const weiPerFromType = rates[this.type]
    const weiPerToType = rates[toType]
    
    const amountInWei = this.amountBigNumber.mul(weiPerFromType)
    const amountInToType = amountInWei.div(weiPerToType)

    return new CurrencyConvertable(
      toType, 
      amountInToType, 
      this.exchangeRates
    )
  }
}

