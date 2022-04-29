import toml from 'toml';
import fs from 'fs';
import { logger } from './utils/logger';

export interface Configs {
  endpoints: {
    polkadot: string[];
    acala: string[];
  }
  strategy: {
    interval?: number;
    atList?: number[];
    remained?: number;
  }
  account: {
    receive: string;
    signer: string;
  }
}

export function getConfigs (file: string) {
  if (!fs.existsSync(file)) {
    logger.error(`config file ${file} is not exists.`);

    process.exit(1);
  }

  const content = fs.readFileSync(file, { encoding: 'utf-8' });

  return toml.parse(content) as Configs;
}