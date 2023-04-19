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

This [section](./docs/migration.md) explains how to migrate a Lisk Core v3.x node to Lisk Core v4.x using the Lisk migrator.

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
