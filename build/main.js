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
const api_1 = require("@polkadot/api");
const util_crypto_1 = require("@polkadot/util-crypto");
const configs_1 = require("./configs");
const acala_1 = require("./utils/acala");
const logger_1 = require("./utils/logger");
const polkadot_1 = require("./utils/polkadot");
const rxjs_1 = require("rxjs");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const configsFile = process.argv[2];
        if (!configsFile) {
            logger_1.logger.error('configs file is required');
            process.exit(1);
        }
        yield (0, util_crypto_1.cryptoWaitReady)();
        const configs = (0, configs_1.getConfigs)(configsFile);
        const keyring = new api_1.Keyring({ type: 'sr25519' });
        const { receive, signer: signerMnemonic } = configs.account;
        const signer = keyring.addFromMnemonic(signerMnemonic);
        const polkadot = new polkadot_1.PolkadotUtils(configs.endpoints.polkadot);
        const acala = new acala_1.AcalaUtils(configs.endpoints.acala);
        yield polkadot.connect();
        yield polkadot.isReady();
        yield acala.connect();
        yield acala.isReady();
        acala.subscribeClaimableData(signer.address);
        polkadot.newBlock((header) => __awaiter(this, void 0, void 0, function* () {
            const blockNumber = header.number.toNumber();
            logger_1.logger.info(`receive height update ${blockNumber}`);
            const data = yield (0, rxjs_1.firstValueFrom)(acala.vestClaimableBalance$);
            if (acala.checkCanClaim(data.vestSchedules, blockNumber, configs.strategy)) {
                logger_1.logger.info(`do claim ${data.claimable.toString()} at ${blockNumber}`);
                acala.doClaim(receive, data.claimable, signer).subscribe({
                    error: logger_1.logger.error.bind(logger_1.logger)
                });
            }
        }));
    });
}
main();
