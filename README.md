#### How To Use

1. install dependences
```bash
yarn
```

2. build code
```bash
yarn run build
```

3. complated the information in karura.configs.toml
  > Be careful to fill the **receive** field.   
  > Don't share the configs files to **ANYONE**.

  | name | desc |
  | -- | -- |
  | strategy.atList | can do claim at target block height |
  | strategy.interval | can do claim in interval |
  | account.receive | the address of receive the claimed balance |
  | account.signer | the mnemonic of the control account |

4. start services
```bash
yarn run start:karura

## or start acala
yarn run start:acala
```
