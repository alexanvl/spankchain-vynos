import BigNumber from 'bignumber.js'
import {WorkerState, ExchangeRates, CurrencyType} from '../../worker/WorkerState'
import Currency from './Currency'
import {Store} from 'redux'

export type AllConversions = {[key in CurrencyType]: CurrencyConvertable}

export default class CurrencyConvertable extends Currency {
  static getExchangeRatesWorker = (store: Store<WorkerState, any>) => () => store.getState().runtime.exchangeRates

  protected getExchangeRates: () => ExchangeRates

  constructor(type: CurrencyType, amount: BigNumber.BigNumber|string|number, exchangeRates: ExchangeRates|(() => ExchangeRates|null)) {
    super(type, amount)

    this.getExchangeRates = (): ExchangeRates => {
      const rates = typeof exchangeRates === 'function' ? exchangeRates() : exchangeRates
      if (!rates) {
        throw new Error('no exchange rates are set')
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
  // public toSPANK: (): Currency => this._convert(this, 'SPANK')
  // public toBOOTY: (): Currency => this._convert(this, 'BOOTY')

  private _convert = (toType: CurrencyType): CurrencyConvertable => {
    const rates: ExchangeRates = this.getExchangeRates()

    const weiPerFromType = rates[this.type]
    const weiPerToType = rates[toType]
    
    const amountInWei = this.amountBigNumber.mul(weiPerFromType)
    const amountInToType = amountInWei.div(weiPerToType)

    return new CurrencyConvertable(
      toType, 
      amountInToType, 
      this.getExchangeRates
    )
  }
}

