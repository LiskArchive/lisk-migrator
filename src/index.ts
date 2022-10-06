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
import { join } from 'path';
import { KVStore } from '@liskhq/lisk-db';
import * as semver from 'semver';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { ROUND_LENGTH } from './constants';
import { getClient } from './client';
import { getConfig, migrateUserConfig } from './utils/config';
import { observeChainHeight, setBlockIDAtSnapshotHeight } from './utils/chain';
import { createGenesisBlock } from './utils/genesis_block';
import { Config } from './types';

// TODO: Import snapshot command from core once implemented
const createSnapshot = async (snapshotPath: string) => snapshotPath;

class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),

		// Custom flags
		'min-compatible-version': flagsParser.string({
			char: 'm',
			required: false,
			description: 'Minimum compatible version required to run the migrator.',
			default: '>=3.0.4 <=3.0', // TODO: Update version to '3.0.5
		}),
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
			required: false,
			env: 'SNAPSHOT_TIME_GAP',
			description:
				'The number of seconds elapsed between the block at height HEIGHT_SNAPSHOT and the snapshot block.',
		}),
		'auto-migrate-config': flagsParser.boolean({
			required: false,
			env: 'AUTO_MIGRATE_CONFIG',
			description: 'Migrate user configuration automatically. Default to false.',
			default: false,
		}),
		'auto-download-lisk-core-v4': flagsParser.boolean({
			required: false,
			env: 'AUTO_DOWNLOAD_LISK_CORE',
			description: 'Download lisk core v4 automatically. Default to false.',
			default: false,
		}),
		'auto-start-lisk-core-v4': flagsParser.boolean({
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
		'snapshot-path': flagsParser.string({
			char: 'p',
			required: false,
			description:
				'Path where the state snapshot will be creating. Current directory will be considered the default if not provided.',
		}),
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(LiskMigrator);
		const liskCorePath = flags['lisk-core-path'] ?? process.cwd();
		const outputPath = flags.output ?? join(process.cwd(), 'genesis_block.json');
		const snapshotHeight = flags['snapshot-height'];
		const customConfigPath = flags.config;
		const autoMigrateUserConfig = flags['auto-migrate-config'] ?? false;
		const compatibleVersions = flags['min-compatible-version'];
		const snapshotPath = flags['snapshot-path'] ?? process.cwd();

		// const waitThreshold = process.env.NODE_ENV === 'test' ? flags['wait-threshold'] : 201;
		let config: Config;

		cli.action.start(
			`Verifying snapshot height to be multiples of round length i.e ${ROUND_LENGTH}`,
		);
		if (snapshotHeight % ROUND_LENGTH !== 0) {
			this.error(`Invalid Snapshot Height: ${snapshotHeight}.`);
		}
		cli.action.stop('Snapshot Height is valid');

		const client = await getClient(liskCorePath);
		const info = await client.node.getNodeInfo();
		const { version: appVersion } = info;

		cli.action.start('Verifying Lisk-Core version');
		const liskCoreVersion = semver.coerce(appVersion);
		if (!liskCoreVersion) {
			this.error(
				`Unsupported lisk-core version detected. Supported version range ${compatibleVersions}`,
			);
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
			isFinal: false,
		});

		await setBlockIDAtSnapshotHeight(liskCorePath, snapshotHeight);

		// TODO: Placeholder to issue createSnapshot command from lisk-core
		cli.action.start('Creating snapshot');
		await createSnapshot(snapshotPath);
		cli.action.stop();

		await observeChainHeight({
			label: 'Waiting for snapshot height to be finalized',
			liskCorePath,
			height: snapshotHeight,
			delay: 500,
			isFinal: true,
		});

		// Add blockID verification
		// TODO: Stop lisk core automatically if command is available

		// Create new DB instance based on the snapshot path
		cli.action.start('Creating database instance');
		const db = new KVStore(snapshotPath);
		cli.action.stop();

		cli.action.start('Creating genesis block');
		await createGenesisBlock(db, outputPath);
		cli.action.stop();

		if (autoMigrateUserConfig) {
			await migrateUserConfig();
		}
	}
}

export = LiskMigrator;
