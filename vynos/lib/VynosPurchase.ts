import {CurrencyType} from '../worker/WorkerState'
import {PaymentMeta, PurchaseMeta} from './connext/ConnextTypes'
import {ICurrency} from './currency/Currency'

// TODO: Is there a better place to put these?
export type VynosPayment<Type extends CurrencyType> = PaymentMeta & {
  amount: ICurrency<Type>
}

export type VynosPurchase<Type extends CurrencyType = any> = PurchaseMeta & {
  payments: VynosPayment<Type>[]
}
