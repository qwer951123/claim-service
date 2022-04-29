import { options } from "@acala-network/api";
import { ApiRx, WsProvider } from "@polkadot/api";
import { AddressOrPair } from "@polkadot/api/types";
import '@acala-network/types/interfaces/augment-api-tx';
import '@acala-network/types/interfaces/augment-api-query';
import { logger } from "./logger";
import { Configs } from "../configs";
import { combineLatest, Observable, firstValueFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

interface Schedule {
  start: bigint;
  period: bigint;
  periodCount: bigint;
  perPeriod: bigint;
}

interface ClaimableInformation {
  relayChainNumber: bigint;
  vestSchedules: Schedule[];
  vestLocked: bigint;
  transferable: bigint;
  claimable: bigint;
}

export class AcalaUtils {
  private endpoints: string[];
  private api!: ApiRx;
  public vestClaimableBalance$!: Observable<ClaimableInformation>;

  constructor(endpoints: string[]) {
    this.endpoints = endpoints;
  }

  public subscribeClaimableData = (address: string) => {
    this.vestClaimableBalance$ = this.subscribeVestClaimable(address)
    this.vestClaimableBalance$.subscribe();
  }

  public async connect() {
    const provider = new WsProvider(this.endpoints);

    this.api = new ApiRx(options({ provider }))

    await firstValueFrom(this.api.isReady);

    logger.info('acala/karura connected.');
  }

  public isReady() {
    return this.api.isReady
  }

  public subscribeVestingSchedule(address: string): Observable<Schedule[]> {
    return this.api.query.vesting.vestingSchedules(address).pipe(
      map(data => {
        return data.map(i => ({
          start: i.start.toBigInt(),
          period: i.period.toBigInt(),
          periodCount: i.periodCount.toBigInt(),
          perPeriod: i.perPeriod.toBigInt()
        }));
      })
    )
  }

  public checkCanClaim(schedules: Schedule[], currentBlockHeight: number, strategy: Configs['strategy']) {
    return schedules.reduce((acc, cur) => {
      const target = currentBlockHeight + 1;

      // can claim when target in list
      if (strategy.atList && strategy.atList.find(i => i) === target) return acc || true;

      // can claim when target % interval === 0
      if (strategy.interval && target % strategy.interval === 0) return acc || true;

      return acc || false;
    }, false)
  }

  public doClaim(receive: string, amount: bigint, signer: AddressOrPair) {
    return this.api.tx.utility.batchAll([
      this.api.tx.vesting.claim(),
      this.api.tx.currencies.transferNativeCurrency(receive, amount.toString())
    ]).signAndSend(signer, { nonce: -1 });
  }

  public subscribeVestLocked(address: string) {
    return this.api.query.balances.locks(address).pipe(
      map((data) => {
        return data.find(i => i.id.toHuman() === 'ormlvest')?.amount.toBigInt() || BigInt(0);
      })
    )
  }

  public subscribeVestClaimable(address: string) {
    const relayChainNumber$ = this.api.query.parachainSystem.validationData().pipe(
      map((data) => data.unwrapOrDefault().relayParentNumber.toBigInt() || BigInt(0))
    );
    const vestSchedules$ = this.subscribeVestingSchedule(address);
    const vestLocked$ = this.subscribeVestLocked(address);
    const getTotalClaimedBalance = (current: bigint, vestSchedule: Schedule[], vestLocked: bigint) => {
      const totalVesting = vestSchedule.reduce((acc, cur) => {
        const { perPeriod, periodCount } = cur;

        return acc + perPeriod * periodCount;
      }, BigInt(0))
      const planedClaimable = vestSchedule.reduce((acc, cur) => {
        const { perPeriod, start, periodCount, period } = cur;

        if (current >= start) {
          const count = (current - start) / period;

          if (count <= periodCount) {
            return acc + count * perPeriod;
          }
        }

        return acc;
      }, BigInt(0))

      const result = planedClaimable - (totalVesting - vestLocked);

      return result
    };
    const transferable$ = this.api.query.system.account(address).pipe(
      map((data) => {
        const free = data.data.free.toBigInt();
        const miscFrozen = data.data.miscFrozen.toBigInt();
        const feeFrozen = data.data.feeFrozen.toBigInt();

        return free - (miscFrozen - feeFrozen > 0n ? miscFrozen : feeFrozen);
      })
    )

    return combineLatest({
      relayChainNumber: relayChainNumber$,
      vestSchedules: vestSchedules$,
      vestLocked: vestLocked$,
      transferable: transferable$
    }).pipe(
      map(({ relayChainNumber, vestSchedules, vestLocked, transferable }) => {
        return {
          relayChainNumber,
          vestSchedules,
          vestLocked,
          transferable,
          claimable: getTotalClaimedBalance(relayChainNumber, vestSchedules, vestLocked)
        }
      }
      ),
      shareReplay(1)
    )
  }
}