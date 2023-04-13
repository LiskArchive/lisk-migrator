![Logo](./docs/assets/banner_migrator.png)

# Lisk Migrator

Lisk Migrator is a command line tool to migrate the blockchain data to the latest protocol when hard fork.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Code coverage](https://codecov.io/gh/LiskHQ/lisk-migrator/branch/main/graph/badge.svg?token=ICP600XKH1)](https://codecov.io/gh/LiskHQ/lisk-migrator)

## Setup

Follow our Lisk Documentation guide for [setting up the Lisk migrator](https://lisk.com/documentation/lisk-core/management/migration.html#setting-up-the-lisk-migrator)

## Build Distributions (Linux, Darwin)

<!-- build -->

```sh-session
$ git clone https://github.com/LiskHQ/lisk-migrator
$ cd lisk-migrator
$ git checkout $tag
$ nvm install $(cat .nvmrc)
$ npm install --global yarn
$ yarn; yarn build;
$ npx oclif-dev pack --targets=linux-x64,darwin-x64
```

<!-- buildstop -->

### Running Tests

Lisk Migrator has an extensive set of unit tests. To run the tests, please install Lisk Migrator from source, and then run the command:

```sh
$ npm test
```

## Lisk V4.x Migration guide

This section explains how to migrate a Lisk Core v3.0.0 node to Lisk Core v4.x using the Lisk migrator.

The Lisk migrator CLI tool will generate a new genesis block for Lisk Core v4.
The new genesis block is created based on a snapshot of the old blockchain (running on Lisk Core v3.0.0) at a given height.

> Note: All actively forging validators on the Lisk Mainnet and the Lisk Testnet need to follow this guide to correctly migrate their nodes to the new network, in order to not miss any blocks after the network hard fork.

**Ensure you are running version 3.0.0 of Lisk Core**

Ensure you are running version 3.0.0 of Lisk Core to be able to seamlessly migrate to Lisk Core 4.x.

**Setting up the Lisk migrator**

### Download checksum and verify

Download the checksum and verify the successful download of lisk-migrator.

```
curl -o lisk-migrator-v2.0.0.SHA256 https://downloads.lisk.com/lisk-migrator/lisk-migrator-v2.0.0.SHA256
```

### Extract and add to PATH

```
tar -xf ./lisk-migrator-v2.0.0.SHA256
```

Make the `lisk-migrator` command available in the PATH, e.g. by executing the following command:

```
export PATH="$PATH:$HOME/lisk-migrator/bin"
```

> Replace `$HOME` with the absolute path of where the `lisk-migrator` folder is located, in case it was extracted somewhere else other than in your home directory.

> Alternatively migrator setup can be done by following the steps defined in section [here](#setup).

**Setting up the Lisk Core 4.x**

### Migration Steps

**Check the announced snapshot height**

- For Mainnet: `TBD`
- For Testnet: `TBD`

**Run Lisk Migrator**

The Lisk migrator v2.0.0 allow users to download and start Lisk Core v4.x. It can be done by passing the relavant flags.

```
USAGE
$ lisk-migrator [-d <value>] [-m <value>] [-c <value>] [-o <value>] [-p <value>] [-p <value>] [--snapshot-time-gap <value>] [--auto-download-lisk-core-v4] [--auto-migrate-config] [--auto-start-lisk-core-v4] [--use-existing-snapshot]

FLAGS
  -c, --config=config                                  Custom configuration file path.
  -d, --lisk-core-path=lisk-core-path                  Path where the lisk-core instance is running. Current directory will be considered the default if not provided.
  -h, --help                                           show CLI help
  -m, --min-compatible-version=min-compatible-version  [default: >=3.0.4 <=3.0] Minimum compatible version required to run the migrator.
  -o, --output=output                                  File path to write the genesis block json. If not provided, it will default to cwd/genesis_block.json.
  -p, --snapshot-path=snapshot-path                    Path where the state snapshot will be created. When not supplied, defaults to the current directory.
  -s, --snapshot-height=snapshot-height                (required) The height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.
  -v, --version                                        show CLI version
  --auto-download-lisk-core-v4                         Download lisk core v4 automatically. Default to false.
  --auto-migrate-config                                Migrate user configuration automatically. Default to false.
  --auto-start-lisk-core-v4                            Start lisk core v4 automatically. Default to false.
  --snapshot-time-gap=snapshot-time-gap                The number of seconds elapsed between the block at height HEIGHT_SNAPSHOT and the snapshot block.
  --use-existing-snapshot                              Use existing database snapshot (Temporary flag, will be removed once createSnapshot command is available on Lisk Core).

EXAMPLES
  lisk-migrator --snapshot-path  /path/to/snapshot  --snapshot-height 20931763 --lisk-core-path /path/to/data-dir

  lisk-migrator --snapshot-path  /path/to/snapshot  --snapshot-height 20931763 --lisk-core-path /path/to/data-dir --auto-download-lisk-core-v4 --auto-start-lisk-core-v4 --auto-migrate-config
```

If you have added `lisk-migrator` to the PATH as described in the section [setting-up-the-lisk-migrator](#setting-up-the-lisk-migrator), you can start the migration script by running the following command in the terminal:

**Mainnet**

```
lisk-migrator --snapshot-height ${snapshotHeight} --output ~/.lisk/lisk-core/config/mainnet --lisk-core-path ~/lisk-main
```

**Testnet**

```
lisk-migrator --snapshot-height ${snapshotHeight} --output ~/.lisk/lisk-core/config/testnet --lisk-core-path ~/lisk-test
```

- `--snapshot-height`:
  The height on which the blockchain snapshot will be performed.
  The snapshot height will be announced separately.
- `--output`:
  The absolute path to the directory, where the newly generated genesis block should be saved.
- `--lisk-core-path`:
  The absolute path to the directory, where the Lisk Core v3.0.0 node is located.

## Get Involved

| Reason                          | How                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                               |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue          | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

## License

Copyright 2016-2023 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
