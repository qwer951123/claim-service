"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotUtils = void 0;
const api_1 = require("@polkadot/api");
require("@polkadot/rpc-augment/augment/jsonrpc");
const logger_1 = require("./logger");
class PolkadotUtils {
    constructor(endpoints) {
        this.endpoints = endpoints;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new api_1.WsProvider(this.endpoints);
            this.api = yield api_1.ApiPromise.create({ provider });
            yield this.api.isReady;
            logger_1.logger.info('polkadot/kusama connected.');
        });
    }
    isReady() {
        return this.api.isReady;
    }
    newBlock(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.api.rpc.chain.subscribeNewHeads(callback);
        });
    }
}
exports.PolkadotUtils = PolkadotUtils;
