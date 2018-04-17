declare module 'web3-provider-engine/subproviders/subprovider' {
  export class Subprovider {
    emitPayload (call: any, cb: (err: any, res: any) => void)
  }
}
