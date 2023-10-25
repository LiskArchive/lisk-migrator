# Migration Guide

This section explains how to migrate a Lisk Core v3.1.0 node to Lisk Core v4.0.0 using the Lisk Migrator.

The Lisk Migrator CLI tool will generate a new genesis (snapshot) block for Lisk Core v4.0.0.
The new genesis block is created based on a snapshot of the existing blockchain (running on Lisk Core v3.1.0) at a pre-determined height.

Lisk Migrator automatically exports the node's Forging Status information to the file named `forgingStatus.json` under the output directory.
In case, the Lisk Migrator is unable to save to the disk, as a fallback, the Forging Status information is logged to the standard output.

<!--

> Note: Please ensure that the file name and the checksum filename are the same, whereby the checksum file has an additional extension (lisk-migrator-v2.0.0.tar.gz, and will have a checksum file by the name of lisk-migrator-v2.0.0.tar.gz.SHA256), and are present in the same directory.

-->

Please ensure you are running version v3.0.4 (or later) of Lisk Core to be able to seamlessly migrate to Lisk Core 4.x.

## Setting up the Lisk Migrator

The migrator setup can be performed by following the steps defined in the `SETUP` section [here](../README.md#setup).

<!--


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

-->

## Migration Steps

**Check the announced snapshot height**

- For Mainnet: `TBD`
- For Testnet: `20449414`

### Run Lisk Migrator

The Lisk Migrator v2 also allows users to download and start the Lisk Core v4.x automatically, post migration. This can be achieved by passing the relevant flags shown below.

```
USAGE
$ lisk-migrator [-d <value>] [-m <value>] [-c <value>] [-o <value>] [-p <value>] [-p <value>] [--snapshot-time-gap <value>] [--auto-migrate-config] [--auto-start-lisk-core-v4] [--snapshot-path] [--network]

OPTIONS
  -c, --config=config                                  Custom configuration file path for Lisk Core v3.1.x.
  -d, --lisk-core-v3-data-path=lisk-core-v3-data-path  Path where the Lisk Core v3.x instance is running. When not supplied, defaults to the default data directory for Lisk Core.
  -h, --help                                           show CLI help
  -n, --network=(mainnet|testnet)                      Network to be considered for the migration. Depends on the '--snapshot-path' flag.

  -o, --output=output                                  File path to write the genesis block. If not provided, it will default to cwd/output/{v3_networkIdentifier}/genesis_block.blob. Do not use any value starting with the default data path reserved for Lisk Core: '~/.lisk/lisk-core'.

  -p, --page-size=page-size                            [default: 100000] Maximum number of blocks to be iterated at once for computation. Defaults to 100000.

  -s, --snapshot-height=snapshot-height                (required) The height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.

  -v, --version                                        show CLI version

  --auto-migrate-config                                Migrate user configuration automatically. Defaults to false.

  --auto-start-lisk-core-v4                            Start Lisk Core v4 automatically. Defaults to false. When using this flag, kindly open another terminal window to stop Lisk Core v3.1.x for when the migrator prompts.

  --snapshot-path=snapshot-path                        Local filepath to the state snapshot to run the migration offline. It could point either to a directory or a tarball (tar.gz).

  --snapshot-url=snapshot-url                          URL to download the state snapshot from. Use to run the migration offline. URL must end with tar.gz.

EXAMPLES
  lisk-migrator --snapshot-height 20931763 --lisk-core-path /path/to/data-dir

  lisk-migrator --snapshot-height 20931763 --lisk-core-path /path/to/data-dir --auto-start-lisk-core-v4 --auto-migrate-config
```

<!--

If you have added `lisk-migrator` to the PATH as described in the [setting-up-the-lisk-migrator](#setting-up-the-lisk-migrator) section, you can start the migration script by running the following command in the terminal:

-->

You can start the migration script by running the following command in the terminal:

**Mainnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/mainnet --lisk-core-v3-data-path ~/lisk-main --auto-migrate-config --auto-start-lisk-core-v4
```

**Testnet**

```
lisk-migrator --snapshot-height [recommendedSnapshotHeight] --output ~/.lisk/lisk-core/config/testnet --lisk-core-v3-data-path ~/lisk-test --auto-migrate-config --auto-start-lisk-core-v4
```

- `--snapshot-height`:
  The height at which the blockchain snapshot will be performed.
  The snapshot height will be announced separately.
- `--output`:
  The absolute path to the directory, where the newly generated genesis block should be saved.
- `--lisk-core-v3-data-path`:
  The absolute path to the directory, where the Lisk Core v3.x node is located.
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
