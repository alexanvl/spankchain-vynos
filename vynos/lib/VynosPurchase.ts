import {CurrencyType} from '../worker/WorkerState'
import { PurchaseMeta, PaymentMeta } from "./connext/ConnextTypes";
import Currency from './Currency'

// TODO: Is there a better place to put these?
export interface VynosPayment<Type extends CurrencyType> {
  amount: Currency<Type>
  recipient: string
  meta: PaymentMeta
}

export type VynosPurchase<Type extends CurrencyType=any> = PurchaseMeta & {
  payments: VynosPayment<Type>[]
}
