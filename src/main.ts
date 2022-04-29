import { Keyring } from "@polkadot/api";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getConfigs } from "./configs";
import { AcalaUtils } from "./utils/acala";
import { logger } from "./utils/logger";
import { PolkadotUtils } from "./utils/polkadot";
import { firstValueFrom } from 'rxjs';

async function main() {
  const configsFile = process.argv[2];

  if (!configsFile) {
    logger.error('configs file is required');

    process.exit(1);
  }

  await cryptoWaitReady();

  const configs = getConfigs(configsFile);
  const keyring = new Keyring({ type: 'sr25519' });
  const { receive, signer: signerMnemonic } = configs.account;
  const signer = keyring.addFromMnemonic(signerMnemonic);
  const polkadot = new PolkadotUtils(configs.endpoints.polkadot);
  const acala = new AcalaUtils(configs.endpoints.acala);

  await polkadot.connect();
  await polkadot.isReady();
  await acala.connect();
  await acala.isReady();

  acala.subscribeClaimableData(signer.address);

  polkadot.newBlock(async (header) => {
    const blockNumber = header.number.toNumber();

    logger.info(`receive height update ${blockNumber}`);

    const data = await firstValueFrom(acala.vestClaimableBalance$);

    if (acala.checkCanClaim(data.vestSchedules, blockNumber, configs.strategy)) {
      logger.info(`do claim ${data.claimable.toString()} at ${blockNumber}`);

      acala.doClaim(receive, data.claimable, signer).subscribe({
        error: logger.error.bind(logger)
      })
    }
  })
}

main()