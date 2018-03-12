import {INITIAL_STATE, WorkerState} from './WorkerState'
import {reducerWithInitialState, ReducerBuilder} from 'typescript-fsa-reducers'
import * as actions from './actions'

const reducers: ReducerBuilder<WorkerState, WorkerState> = reducerWithInitialState(INITIAL_STATE)
  .case(actions.setWallet, actions.setWalletHandler)
  .case(actions.setKeyring, actions.setKeyringHandler)
  .case(actions.setDidStoreMnemonic, actions.setDidStoreMnemonicHandler)
  .case(actions.restoreWallet, actions.restoreWalletHandler)
  .case(actions.setTransactionPending, actions.setTransactionPendingHandler)
  .case(actions.rememberPage, actions.rememberPageHandler)
  .case(actions.setLastUpdateDb, actions.setLastUpdateDbHandler)
  .case(actions.setHubBranding, actions.setHubBrandingHandler)
  .case(actions.setCurrentHubUrl, actions.setCurrentHubUrlHandler)
  .case(actions.setCurrentAuthRealm, actions.setCurrentAuthRealmHandler)
  .case(actions.setAuthorizationRequest, actions.setAuthorizationRequestHandler)
  .case(actions.respondToAuthorizationRequest, actions.respondToAuthorizationRequestHandler)
  .case(actions.toggleFrame, actions.toggleFrameHandler)
  .case(actions.setChannels, actions.setChannelsHandler)
  .case(actions.setChannel, actions.setChannelHandler)
  .case(actions.setCurrentAuthToken, actions.setCurrentAuthTokenHandler)
  .case(actions.setHistory, actions.setHistoryHandler)
  .case(actions.setBalance, actions.setBalanceHandler)
  .case(actions.setPendingTransaction, actions.setPendingTransactionHandler)

export default reducers
