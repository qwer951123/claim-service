import { ApiPromise, WsProvider } from "@polkadot/api";
import '@polkadot/rpc-augment/augment/jsonrpc';
import { Header } from "@polkadot/types/interfaces";
import { logger } from "./logger";

export class PolkadotUtils {
  private endpoints: string[];
  private api!: ApiPromise;

  constructor (endpoints: string[]) {
    this.endpoints = endpoints;
  }

  public async connect () {
    const provider = new WsProvider(this.endpoints);

    this.api = await ApiPromise.create({ provider });

    await this.api.isReady;

    logger.info('polkadot/kusama connected.');
  }

  public isReady () {
    return this.api.isReady
  }

  public async newBlock (callback: (header: Header) => void) {
    (this.api.rpc as any).chain.subscribeNewHeads(callback);
  }
}