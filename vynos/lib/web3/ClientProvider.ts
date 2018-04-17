import {ProviderOpts} from 'web3-provider-engine'

const ProviderEngine = require('web3-provider-engine')
const DefaultFixture = require('web3-provider-engine/subproviders/default-fixture')
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters')
const InflightCacheSubprovider = require('web3-provider-engine/subproviders/inflight-cache')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet')
const SanitizingSubprovider = require('web3-provider-engine/subproviders/sanitizer')
const FetchSubprovider = require('web3-provider-engine/subproviders/fetch')

import GaspriceSubprovider from './GaspriceSubprovider';

export default function ClientProvider(opts: any) {
  opts = opts || {}

  const engine = new ProviderEngine(opts.engineParams)

  // static
  const staticSubprovider = new DefaultFixture(opts.static)
  engine.addProvider(staticSubprovider)

  // nonce tracker
  engine.addProvider(new NonceTrackerSubprovider())

  // sanitization
  const sanitizer = new SanitizingSubprovider()
  engine.addProvider(sanitizer)

  // cache layer
  const cacheSubprovider = new CacheSubprovider()
  engine.addProvider(cacheSubprovider)

  // filters
  const filterSubprovider = new FilterSubprovider()
  engine.addProvider(filterSubprovider)

  // inflight cache
  const inflightCache = new InflightCacheSubprovider()
  engine.addProvider(inflightCache)

  const gasprice = new GaspriceSubprovider()
  engine.addProvider(gasprice)

  // id mgmt
  const idmgmtSubprovider = new HookedWalletSubprovider({
    // accounts
    getAccounts: opts.getAccounts,
    // transactions
    processTransaction: opts.processTransaction,
    approveTransaction: opts.approveTransaction,
    signTransaction: opts.signTransaction,
    publishTransaction: opts.publishTransaction,
    // messages
    // old eth_sign
    processMessage: opts.processMessage,
    approveMessage: opts.approveMessage,
    signMessage: opts.signMessage,
    // new personal_sign
    processPersonalMessage: opts.processPersonalMessage,
    processTypedMessage: opts.processTypedMessage,
    approvePersonalMessage: opts.approvePersonalMessage,
    approveTypedMessage: opts.approveTypedMessage,
    signPersonalMessage: opts.signPersonalMessage,
    signTypedMessage: opts.signTypedMessage,
    personalRecoverSigner: opts.personalRecoverSigner,
  })
  engine.addProvider(idmgmtSubprovider)

  // data source
  const dataSubprovider = opts.dataSubprovider || new FetchSubprovider({
    rpcUrl: opts.rpcUrl || 'https://mainnet.infura.io/',
    originHttpHeaderKey: opts.originHttpHeaderKey,
  })
  engine.addProvider(dataSubprovider)

  // start polling
  engine.start()

  return engine

}
