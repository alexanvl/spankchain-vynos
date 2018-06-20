declare module "ethereumjs-wallet" {
  import { Buffer } from "buffer";

  class Wallet {
    static fromPrivateKey(key: Buffer): Wallet;
    getPrivateKey(): Buffer;
    getPrivateKeyString(): string;
    getAddressString(): string;
  }

  export = Wallet;
}

declare module "ethereumjs-wallet/hdkey" {
  import Wallet = require("ethereumjs-wallet");

  class EthereumHDKey {
    getWallet(): Wallet
    derivePath(path: string): EthereumHDKey
    deriveChild(i: number): EthereumHDKey
  }

  function fromMasterSeed(seed: string): EthereumHDKey

  export = {
    fromMasterSeed: fromMasterSeed
  }
}
