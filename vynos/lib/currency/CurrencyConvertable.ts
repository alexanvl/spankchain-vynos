import BigNumber from 'bignumber.js'
import {WorkerState, ExchangeRates, CurrencyType} from '../../worker/WorkerState'
import Currency from './Currency'
import {Store} from 'redux'
import BN = require('bn.js')
import { BEI_PER_BOOTY } from '../constants';

export type AllConversions = {[key in CurrencyType]: CurrencyConvertable}

export default class CurrencyConvertable extends Currency {
  static getExchangeRatesWorker = (store: Store<WorkerState>) => () => store.getState().runtime.exchangeRates!

  protected exchangeRates: () => ExchangeRates

  constructor(type: CurrencyType, amount: BN|BigNumber.BigNumber|string|number, exchangeRates: () => ExchangeRates) {
    super(type, amount)
    this.exchangeRates = () => {
      const er = exchangeRates()
      if (!er) {
        throw new Error('exchange rates not set!')
      }
      return er
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
    if (this.type === CurrencyType.BEI && toType === CurrencyType.BOOTY) {
      return new CurrencyConvertable(
        toType,
        this.amountBigNumber.div(BEI_PER_BOOTY),
        this.exchangeRates,
      )
    }

    if (this.type === CurrencyType.BOOTY && toType === CurrencyType.BEI) {
      return new CurrencyConvertable(
        toType,
        this.amountBigNumber.mul(BEI_PER_BOOTY),
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

