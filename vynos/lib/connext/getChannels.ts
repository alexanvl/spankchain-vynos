import {IConnext, LedgerChannel, VirtualChannel} from "./ConnextTypes"
import getVirtualChannels from "../getVirtualChannels"
import {ChannelState} from "../BuyTransactionTypes"
import aggregateVCBalances from "../aggregateVCBalances";
import getAddress from "../getAddress";
import { Store } from "redux";
import { WorkerState } from "../../worker/WorkerState";
import BN = require('bn.js')
import Currency from "../Currency";

export default async function getChannels(connext: IConnext, store: Store<WorkerState>): Promise<ChannelState|null> {
  const lc: LedgerChannel = await connext.getChannelByPartyA()

  if (!lc) {
    return null
  }

  const vcs: VirtualChannel[] = await getVirtualChannels(lc.channelId)
  const vcBals = aggregateVCBalances(getAddress(store), vcs)

  vcBals.balanceEth = vcBals.balanceEth.add(new BN(lc.ethBalanceA))
  vcBals.balanceToken = vcBals.balanceEth.add(new BN(lc.tokenBalanceA))

  return {
    ledgerId: lc.channelId,
    ...vcBals,
    currentVCs: vcs,
    currentLC: lc,
  }
}
