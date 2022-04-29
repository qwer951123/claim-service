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
exports.AcalaUtils = void 0;
const api_1 = require("@acala-network/api");
const api_2 = require("@polkadot/api");
require("@acala-network/types/interfaces/augment-api-tx");
require("@acala-network/types/interfaces/augment-api-query");
const logger_1 = require("./logger");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
class AcalaUtils {
    constructor(endpoints) {
        this.subscribeClaimableData = (address) => {
            this.vestClaimableBalance$ = this.subscribeVestClaimable(address);
            this.vestClaimableBalance$.subscribe();
        };
        this.endpoints = endpoints;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new api_2.WsProvider(this.endpoints);
            this.api = new api_2.ApiRx((0, api_1.options)({ provider }));
            yield (0, rxjs_1.firstValueFrom)(this.api.isReady);
            logger_1.logger.info('acala/karura connected.');
        });
    }
    isReady() {
        return this.api.isReady;
    }
    subscribeVestingSchedule(address) {
        return this.api.query.vesting.vestingSchedules(address).pipe((0, operators_1.map)(data => {
            return data.map(i => ({
                start: i.start.toBigInt(),
                period: i.period.toBigInt(),
                periodCount: i.periodCount.toBigInt(),
                perPeriod: i.perPeriod.toBigInt()
            }));
        }));
    }
    checkCanClaim(schedules, currentBlockHeight, strategy) {
        return schedules.reduce((acc, cur) => {
            const { start } = cur;
            const target = currentBlockHeight + 1;
            if (start > target)
                return acc || false;
            // can claim when current block - 1 < start
            if (start === BigInt(target))
                return acc || true;
            // can claim when target in list
            if (strategy.atList && strategy.atList.find(i => i) === target)
                return acc || true;
            // can claim when target % interval === 0
            if (strategy.interval && target % strategy.interval === 0)
                return acc || true;
            return acc || false;
        }, false);
    }
    doClaim(receive, amount, signer) {
        return this.api.tx.utility.batchAll([
            this.api.tx.vesting.claim(),
            this.api.tx.currencies.transferNativeCurrency(receive, amount.toString())
        ]).signAndSend(signer, { nonce: -1 });
    }
    subscribeVestLocked(address) {
        return this.api.query.balances.locks(address).pipe((0, operators_1.map)((data) => {
            var _a;
            return ((_a = data.find(i => i.id.toHuman() === 'ormlvest')) === null || _a === void 0 ? void 0 : _a.amount.toBigInt()) || BigInt(0);
        }));
    }
    subscribeVestClaimable(address) {
        const relayChainNumber$ = this.api.query.parachainSystem.validationData().pipe((0, operators_1.map)((data) => data.unwrapOrDefault().relayParentNumber.toBigInt() || BigInt(0)));
        const vestSchedules$ = this.subscribeVestingSchedule(address);
        const vestLocked$ = this.subscribeVestLocked(address);
        const getTotalClaimedBalance = (current, vestSchedule, vestLocked) => {
            const totalVesting = vestSchedule.reduce((acc, cur) => {
                const { perPeriod, periodCount } = cur;
                return acc + perPeriod * periodCount;
            }, BigInt(0));
            const planedClaimable = vestSchedule.reduce((acc, cur) => {
                const { perPeriod, start, periodCount, period } = cur;
                if (current >= start) {
                    const count = (current - start) / period;
                    if (count <= periodCount) {
                        return acc + count * perPeriod;
                    }
                }
                return acc;
            }, BigInt(0));
            const result = planedClaimable - (totalVesting - vestLocked);
            return result;
        };
        // 1. get the total current relay chain block number stored in acala
        return (0, rxjs_1.combineLatest)({
            relayChainNumber: relayChainNumber$,
            vestSchedules: vestSchedules$,
            vestLocked: vestLocked$
        }).pipe((0, operators_1.map)(({ relayChainNumber, vestSchedules, vestLocked }) => {
            return {
                relayChainNumber,
                vestSchedules,
                vestLocked,
                claimable: getTotalClaimedBalance(relayChainNumber, vestSchedules, vestLocked)
            };
        }), (0, operators_1.shareReplay)(1));
    }
}
exports.AcalaUtils = AcalaUtils;
