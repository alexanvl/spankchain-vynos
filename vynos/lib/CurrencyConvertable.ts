import BigNumber from 'bignumber.js'
import {WorkerState, ExchangeRates, CurrencyType} from '../worker/WorkerState'
import Currency from './Currency'
import {Store} from 'redux'

export type AllConversions = {[key in CurrencyType]: CurrencyConvertable}

export default class CurrencyConvertable extends Currency {
  static getExchangeRatesWorker = (store: Store<WorkerState>) => () => store.getState().runtime.exchangeRates

  protected getExchangeRates: () => ExchangeRates

  constructor(type: CurrencyType, amount: BigNumber.BigNumber|string|number, exchangeRates: ExchangeRates|(() => ExchangeRates|null)) {
    super(type, amount)

    this.getExchangeRates = (): ExchangeRates => {
      const er = typeof exchangeRates === 'function' ? exchangeRates() : exchangeRates
      if (!er) {
        throw new Error('no exchange rates are set')
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
  // public toSPANK: (): Currency => this._convert(this, 'SPANK')
  // public toBOOTY: (): Currency => this._convert(this, 'BOOTY')

  private _convert = (toType: CurrencyType): CurrencyConvertable => {
    const exchangeRates: ExchangeRates = this.getExchangeRates()

    const fromCurrencyRate = exchangeRates[this.type]
    const amountWei = this.amountBigNumber.mul(fromCurrencyRate)
    const toConversionRate = exchangeRates[toType]
    const amountInToType = amountWei.div(toConversionRate)

    return new CurrencyConvertable(toType, amountInToType, this.getExchangeRates)
  }
}

