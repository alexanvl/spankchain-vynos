import {VirtualChannel} from './connext/ConnextTypes'
import BN = require('bn.js')
import Currency from './currency/Currency'
import currencyAsJSON from './currency/currencyAsJSON'
import {ICurrency} from './currency/Currency'
import {LedgerChannel} from './connext/ConnextTypes'

type ConnextBalanceType = 'ethBalance'|'tokenBalance'

export const aggregateVCAndLCBalances = (address: string, vcs: VirtualChannel[], lc: LedgerChannel, isBootySupport: boolean) => ({
  ethBalance: Currency.WEI(
    aggregateVCBalancesWEI(address, vcs)
      .amountBN
      .add(new BN(lc.ethBalanceA || 0))
  ),
  tokenBalance: isBootySupport ? Currency.BEI(
    aggregateVCBalancesBOOTY(address, vcs)
      .amountBN
      .add(new BN(lc.tokenBalanceA || 0))
  ) : Currency.BEI(0)
})

export const aggregateVCBalances = (address: string, vcs: VirtualChannel[], isBootySupport: boolean) => ({
  ethBalance: currencyAsJSON(aggregateVCBalancesWEI(address, vcs)) as ICurrency,
  tokenBalance: currencyAsJSON(isBootySupport
    ? aggregateVCBalancesBOOTY(address, vcs) as ICurrency
    : Currency.BEI(0)),
})

export const aggregateVCBalancesWEI = (address: string, vcs: VirtualChannel[]) => Currency.WEI(aggregateBalance(address, vcs, 'ethBalance'))
export const aggregateVCBalancesBOOTY = (address: string, vcs: VirtualChannel[]) => Currency.BEI(aggregateBalance(address, vcs, 'tokenBalance'))

const aggregateBalance = (
  address: string,
  vcs: VirtualChannel[],
  balanceType: 'ethBalance'|'tokenBalance'
): BN => vcs.reduce((acc: BN, curr: VirtualChannel) =>
  acc.add(getSubBalanceAmountBN(address, curr, balanceType))
  , new BN(0)
)

const getSubBalanceAmountBN = (address: string, vc: VirtualChannel, balanceType: ConnextBalanceType): BN => {
  if (address !== vc.partyA && address !== vc.partyB) {
    throw new Error('channel does not belong to address')
  }

  const isPartyA = address === vc.partyA

  let balance: string

  if (balanceType === 'ethBalance') {
    balance = isPartyA
      ? vc.ethBalanceA
      : vc.ethBalanceB
  } else { // (balanceType === 'tokenBalance')
    balance = isPartyA
      ? vc.tokenBalanceA
      : vc.tokenBalanceB
  }

  return new BN(balance || 0)
}
