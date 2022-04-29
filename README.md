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
  | strategy.atList | specify a certain set of block heights to claim |
  | strategy.interval | set how many blocks interval to claim |
  | strategy.remained| config the remained balance in the account |
  | account.receive | the address of receive the claimed balance |
  | account.signer | the mnemonic of the control account |

4. start services
```bash
yarn run start:karura

## or start acala
yarn run start:acala
```
