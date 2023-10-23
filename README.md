![Logo](./docs/assets/banner_migrator.png)

# Lisk Migrator

Lisk Migrator is a command line tool to migrate the blockchain data to the latest protocol when hard fork.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Code coverage](https://codecov.io/gh/LiskHQ/lisk-migrator/branch/main/graph/badge.svg?token=ICP600XKH1)](https://codecov.io/gh/LiskHQ/lisk-migrator)
[![DeepScan grade](https://deepscan.io/api/teams/6759/projects/24469/branches/755683/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=6759&pid=24469&bid=755683)
![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/liskHQ/lisk-migrator)
![GitHub repo size](https://img.shields.io/github/repo-size/liskhq/lisk-migrator)
![GitHub issues](https://img.shields.io/github/issues-raw/liskhq/lisk-migrator)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/liskhq/lisk-migrator)

## Installation

### Dependencies

The following dependencies need to be installed in order to run applications created with the Lisk SDK:

| Dependencies | Version        |
| ------------ | -------------- |
| NodeJS       | ^18.16         |
| NPM          | 8.3.1 or later |
| Lisk Core    | 3.1.0 or later |

**NOTE**: It is important that NodeJS is installed using NVM. Please refer our documentation [here](https://lisk.com/documentation/lisk-core/v4/setup/npm.html#node-js-npm).

### System requirements

The following system requirements are recommended to run Lisk Migrator v2.0.0:

#### Memory

- Machines with a minimum of 4 GB RAM.

#### Storage

- Machines with a minimum of 40 GB HDD.

## Setup

Follow our Lisk Documentation guide for [setting up the Lisk migrator](https://lisk.com/documentation/lisk-core/management/migration.html#setting-up-the-lisk-migrator).

### Build Distributions (Linux, Darwin) from source

Clone the Lisk Migrator repository using Git and initialize the modules.

```sh
$ git clone https://github.com/LiskHQ/lisk-migrator
$ cd lisk-migrator
$ git checkout $tag
$ nvm install $(cat .nvmrc)
$ npm install --global yarn
$ yarn; yarn build;
$ PLATFORM=$(uname | tr '[:upper:]' '[:lower:]')
$ ARCH=$(uname -m | sed 's/x86_64/x64/')
$ npx oclif-dev pack --targets=$PLATFORM-$ARCH
```

### Using the Migrator

After building the binaries, please extract the appropriate tarball and add it the the PATH environment variable as shown below to continue with the usage.

> Requires `jq`. If not already installed, please check https://jqlang.github.io/jq/download on how to install.

```sh
$ MIGRATOR_VERSION=$(jq -r .version < package.json)
$ PLATFORM=$(uname | tr '[:upper:]' '[:lower:]')
$ ARCH=$(uname -m | sed 's/x86_64/x64/')
$ mkdir ~/lisk-migrator-extract
$ find ./dist -name lisk-migrator-v$MIGRATOR_VERSION-$PLATFORM-$ARCH.tar.gz -exec cp {} ~/lisk-migrator-extract \;
$ tar -C ~/lisk-migrator-extract -xf ~/lisk-migrator-extract/lisk-migrator-v$MIGRATOR_VERSION-$PLATFORM-$ARCH.tar.gz
$ export PATH="$PATH:$HOME/lisk-migrator-extract/lisk-migrator/bin"
```

<!-- usage -->

```sh-session
$ lisk-migrator COMMAND
running command...
$ lisk-migrator (-v|--version|version)
lisk-migrator/2.0.0-rc.4 darwin-arm64 node-v18.16.1
$ lisk-migrator --help [COMMAND]
USAGE
  $ lisk-migrator COMMAND
...
```

<!-- usagestop -->

<!-- commands -->

# Command Topics

- [`lisk-migrator help`](docs/commands/help.md) - display help for lisk-migrator

<!-- commandsstop -->

### Running Tests

Lisk Migrator has an extensive set of unit tests. To run the tests, please install Lisk Migrator from source, and then run the command:

```sh
$ npm test
```

## Migrating from Lisk Core v3.1.0 to v4.0.0

The [migration guide](./docs/migration.md) explains the transition process from Lisk Core v3.1.0 (or later) to Lisk Core v4.0.0 using Lisk Migrator v2.

## Get Involved

| Reason                          | How                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                               |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue          | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

## License

Copyright 2016-2024 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
