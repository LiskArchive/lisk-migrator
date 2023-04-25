# Migration Guide

This section explains how to migrate a Lisk Core v3.0.4 (or later) node to Lisk Core v4.x using the Lisk Migrator.

The Lisk Migrator CLI tool will generate a new genesis (snapshot) block for Lisk Core v4.x.
The new genesis block is created based on a snapshot of the existing blockchain (running on Lisk Core v3.0.4+) at a pre-determined height.

> Note: Please ensure that the file name and the checksum filename are the same, whereby the checksum file has an additional extension (lisk-migrator-v2.0.0.tar.gz, and will have a checksum file by the name of lisk-migrator-v2.0.0.tar.gz.SHA256) and are present in the same directory.

Please ensure you are running version v3.0.4 (or later) of Lisk Core to be able to seamlessly migrate to Lisk Core 4.x.

## Setting up the Lisk Migrator

### Download checksum and verify

Download the checksum and verify the successful download of lisk-migrator.

```
curl -O https://downloads.lisk.com/lisk-migrator/lisk-migrator-v2.0.0.tar.gz.SHA256
```

### Verify checksum

**Linux**

```
sha256sum -c lisk-migrator-v2.0.0.tar.gz.SHA256
lisk-migrator-v2.0.0.tar.gz: OK
```

**MacOS**

```
shasum -a 256 -c lisk-migrator-v2.0.0.tar.gz.SHA256
lisk-migrator-v2.0.0.tar.gz: OK
```

> Note: Please ensure that the file name and the checksum filename are the same, where the checksum file has an additional extension (lisk-migrator-v2.0.0.tar.gz, and will have a checksum file by the name of lisk-migrator-v2.0.0.tar.gz.SHA256), which are present in the same directory.

### Add to PATH

Make the `lisk-migrator` command available in the PATH, e.g. by executing the following command:

```
export PATH="$PATH:$HOME/lisk-migrator/bin"
```

> Replace `$HOME` with the absolute path of where the `lisk-migrator` folder is located, in case it was extracted somewhere else other than in your home directory.

> Alternatively the migrator setup can be performed by following the steps defined in this section [here](../README.md).

## Migration Steps

**Check the announced snapshot height**

- For Mainnet: `TBD`
- For Testnet: `TBD`

### Run Lisk Migrator

The Lisk Migrator v2 also allows users to download and start the Lisk Core v4.x automatically, post migration. This can be achieved by passing the relevant flags shown below.

```
USAGE
$ lisk-migrator [-d <value>] [-m <value>] [-c <value>] [-o <value>] [-p <value>] [-p <value>] [--snapshot-time-gap <value>] [--auto-download-lisk-core-v4] [--auto-migrate-config] [--auto-start-lisk-core-v4] [--use-existing-snapshot]

FLAGS
  -c, --config=config                                  Custom configuration file path.
  -d, --lisk-core-v3-data-path=lisk-core-v3-data-path  Path where the lisk-core v3.x instance is running. Current home directory will be considered the default if not provided.
  -h, --help                                           Shows CLI help.
  -m, --min-compatible-version=min-compatible-version  [default: >=3.0.4 <=3.0] Minimum compatible version required to run the migrator.
  -o, --output=output                                  File path to write the genesis block json. If not provided, it will default to cwd/genesis_block.json.
  -p, --snapshot-path=snapshot-path                    Path where the state snapshot will be created. When not provided it defaults to the current directory.
  -s, --snapshot-height=snapshot-height                (Required) The height at which the re-genesis block will be generated. Can be specified with the SNAPSHOT_HEIGHT as well.
  -v, --version                                        Shows the CLI version.
  --auto-download-lisk-core-v4                         Download lisk-core v4 automatically. Default to false.
  --auto-migrate-config                                Migrate user configuration automatically. Default to false.
  --auto-start-lisk-core-v4                            Start lisk-core v4 automatically. Default to false.
  --snapshot-time-gap=snapshot-time-gap                The number of seconds elapsed between the block at height HEIGHT_SNAPSHOT and the snapshot block.
  --use-existing-snapshot                              Use the existing database snapshot (Temporary flag, will be removed once the `createSnapshot` command is available on Lisk Core v3.x).

EXAMPLES
  lisk-migrator --snapshot-path  /path/to/snapshot  --snapshot-height 20931763 --lisk-core-path /path/to/data-dir

  lisk-migrator --snapshot-path  /path/to/snapshot  --snapshot-height 20931763 --lisk-core-path /path/to/data-dir --auto-download-lisk-core-v4 --auto-start-lisk-core-v4 --auto-migrate-config
```

If you have added `lisk-migrator` to the PATH as described in the [setting-up-the-lisk-migrator](#setting-up-the-lisk-migrator) section, you can start the migration script by running the following command in the terminal:

**Mainnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/mainnet --lisk-core-v3-data-path ~/lisk-main --auto-download-lisk-core-v4  --auto-migrate-config --auto-start-lisk-core-v4
```

**Testnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/testnet --lisk-core-v3-data-path ~/lisk-test --auto-download-lisk-core-v4  --auto-migrate-config --auto-start-lisk-core-v4
```

- `--snapshot-height`:
  The height at which the blockchain snapshot will be performed.
  The snapshot height will be announced separately.
- `--output`:
  The absolute path to the directory, where the newly generated genesis block should be saved.
- `--lisk-core-v3-data-path`:
  The absolute path to the directory, where the Lisk Core v3.x node is located.
- `--auto-download-lisk-core-v4`:
  Download Lisk Core v4.x automatically.
- `--auto-migrate-config`:
  Migrate Lisk Core v3.x configuration to v4.x automatically.
- `--auto-start-lisk-core-v4`:
  Start Lisk Core v4.x automatically.

Alternatively, the genesis block and configuration for Lisk Core v4.x migration can be created separately without starting Lisk Core v4.x automatically as shown below:

**Mainnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/mainnet --lisk-core-v3-data-path ~/lisk-main --auto-migrate-config
```

**Testnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/testnet --lisk-core-v3-data-path ~/lisk-test --auto-migrate-config
```

In case `--auto-start-lisk-core-v4` is disabled, please install & start Lisk Core v4.x manually.
Please follow the steps in the [README guide](https://github.com/LiskHQ/lisk-core/blob/development/README.md#installation) to perform the installation.

```
lisk-core start --network ${network} --api-ipc --api-ws --config=~/.lisk/lisk-core/config/${network}/config.json
```
