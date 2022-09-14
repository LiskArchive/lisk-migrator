/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import * as semver from 'semver';
import { join } from 'path';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { ROUND_LENGTH } from './constants';
import { getClient } from './client';
import { getConfig, isBinaryBuild, migrateUserConfig } from './utils/config';
import { observeChainHeight } from './utils/chain';
// import { createDb, verifyConnection, createSnapshot } from './utils/storage';
// import { createGenesisBlockFromStorage, writeGenesisBlock } from './utils/genesis_block';
import { Config } from './types';

// TODO: Update version to '>=3.0.5
const compatibleVersions = '>=3.0.4 <=3.0';

class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),

		// Custom flags
		output: flagsParser.string({
			char: 'o',
			required: false,
			description:
				'File path to write the genesis block json. If not provided, it will default to cwd/genesis_block.json.',
		}),
		'lisk-core-path': flagsParser.string({
			char: 'p',
			required: false,
			description:
				'Path where the lisk-core instance is running. Current directory will be considered the default if not provided.',
		}),
		config: flagsParser.string({
			char: 'c',
			required: false,
			description: 'Custom configuration file path.',
		}),
		'snapshot-height': flagsParser.integer({
			char: 's',
			required: true,
			env: 'SNAPSHOT_HEIGHT',
			description:
				'The height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.',
		}),
		'snapshot-time-gap': flagsParser.integer({
			char: 's',
			required: false,
			env: 'SNAPSHOT_TIME_GAP',
			description:
				'The number of seconds elapsed between the block at height HEIGHT_SNAPSHOT and the snapshot block.',
		}),
		'auto-migrate-config': flagsParser.boolean({
			char: 's',
			required: false,
			env: 'AUTO_MIGRATE_CONFIG',
			description: 'Migrate user configuration automatically. Default to false.',
			default: false,
		}),
		'auto-download-lisk-core-v4': flagsParser.boolean({
			char: 's',
			required: false,
			env: 'AUTO_DOWNLOAD_LISK_CORE',
			description: 'Download lisk core v4 automatically. Default to false.',
			default: false,
		}),
		'auto-start-lisk-core-v4': flagsParser.boolean({
			char: 's',
			required: false,
			env: 'AUTO_START_LISK_CORE',
			description: 'Start lisk core v4 automatically. Default to false.',
			default: false,
		}),
		'wait-threshold': flagsParser.integer({
			char: 'w',
			required: true,
			env: 'SNAPSHOT_WAIT_THRESHOLD',
			description:
				'Blocks to wait before creating a snapshot. Applies only if NODE_ENV=test otherwise 201 value be used.',
			default: 201,
		}),
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(LiskMigrator);
		const liskCorePath = flags['lisk-core-path'] ?? process.cwd();
		// const outputPath = flags.output ?? join(process.cwd(), 'genesis_block.json');
		const snapshotHeight = flags['snapshot-height'];
		const customConfigPath = flags.config;
		const autoMigrateUserConfig = flags['auto-migrate-config'] ?? false;
		// const waitThreshold = process.env.NODE_ENV === 'test' ? flags['wait-threshold'] : 201;
		let config: Config;

		const client = await getClient(liskCorePath);
		const info = await client.node.getNodeInfo();
		const { version: appVersion } = info;

		cli.action.start('Verifying Snapshot Height is an end of round block');
		if (snapshotHeight % ROUND_LENGTH !== 0) {
			this.error('Invalid Snapshot Height.');
		}
		cli.action.stop('Snapshot Height is valid');

		cli.action.start('Verifying Lisk-Core version');
		const liskCoreVersion = semver.coerce(appVersion);
		if (!liskCoreVersion) {
			this.error('Unable to detect the lisk-core version.');
		}
		if (!semver.satisfies(liskCoreVersion, compatibleVersions)) {
			this.error(
				`Lisk-Migrator utility is not compatible for lisk-core version ${liskCoreVersion.version}. Compatible versions range is: ${compatibleVersions}`,
			);
		}
		cli.action.stop(`${liskCoreVersion.version} detected`);

		// User specified custom config file
		if (customConfigPath) {
			config = await getConfig(liskCorePath, customConfigPath);

			// Custom config file used by `lisk.sh` in binary build
		} else if (isBinaryBuild(liskCorePath)) {
			config = await getConfig(liskCorePath, join(liskCorePath, 'config.json'));
		} else {
			config = await getConfig(liskCorePath);
		}

		// TODO: Remove the debug, added only to fix unused variable error
		this.debug(config);

		await observeChainHeight({
			label: 'Waiting for snapshot height',
			liskCorePath,
			height: snapshotHeight,
			delay: 500,
		});

		if (autoMigrateUserConfig) await migrateUserConfig();

		// TODO: This section will be refactored in the next issues
		// const storageConfig = config.components.storage;

		// cli.action.start(`Verifying connection to database "${storageConfig.database}"`);
		// const db = createDb(storageConfig);
		// await verifyConnection(db);
		// cli.action.stop();

		// cli.action.start('Creating snapshot');
		// const time = Date.now();
		// await createSnapshot(db);
		// cli.action.stop(`done in ${Date.now() - time}ms`);

		// await observeChainHeight({
		// 	label: 'Waiting for threshold height',
		// 	db,
		// 	height: snapshotHeight + waitThreshold,
		// 	delay: 500,
		// });

		// const genesisBlock = await createGenesisBlockFromStorage({
		// 	db,
		// 	snapshotHeight,
		// 	epochTime: config.app.genesisConfig.EPOCH_TIME,
		// });

		// cli.action.start('Exporting genesis block');
		// writeGenesisBlock(genesisBlock, outputPath);
		// cli.action.stop();
		// this.log(outputPath);

		// db.$pool.end();
	}
}

export = LiskMigrator;
