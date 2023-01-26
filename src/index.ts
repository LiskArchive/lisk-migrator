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
import * as fs from 'fs-extra';
import { join } from 'path';
import { Application, ApplicationConfig } from 'lisk-framework';
import { KVStore } from '@liskhq/lisk-db';
import * as semver from 'semver';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { Block } from '@liskhq/lisk-chain';
import { NETWORK_CONSTANT, ROUND_LENGTH } from './constants';
import { getAPIClient } from './client';
import {
	getConfig,
	migrateUserConfig,
	resolveConfigPathByNetworkID,
	createBackup,
	writeConfig,
	validateConfig,
} from './utils/config';
import {
	observeChainHeight,
	setBlockIDAtSnapshotHeight,
	getBlockIDAtSnapshotHeight,
	getBlockIDAtHeight,
	getTokenIDLsk,
	getHeightPreviousSnapshotBlock,
} from './utils/chain';
import { createGenesisBlock, writeGenesisBlock } from './utils/genesis_block';
import { ConfigV3 } from './types';
import { CreateAsset } from './createAsset';
import { installLiskCore, startLiskCore } from './utils/node';

// TODO: Import snapshot command from core once implemented
const createSnapshot = async (liskCorePath: string, snapshotPath: string) => ({
	liskCorePath,
	snapshotPath,
});

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
			char: 'd',
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
		'snapshot-path': flagsParser.string({
			char: 'p',
			required: false,
			description:
				'Path where the state snapshot will be created. When not supplied, defaults to the current directory.',
		}),
	};

	public async run(): Promise<void> {
		try {
			const { flags } = this.parse(LiskMigrator);
			const liskCorePath = flags['lisk-core-path'] ?? process.cwd();
			const outputPath = flags.output ?? join(process.cwd(), 'genesis_block');
			const snapshotHeight = flags['snapshot-height'];
			const customConfigPath = flags.config;
			const autoMigrateUserConfig = flags['auto-migrate-config'] ?? false;
			const compatibleVersions = flags['min-compatible-version'];
			const snapshotPath = flags['snapshot-path'] ?? process.cwd();
			const autoDownloadLiskCoreV4 = flags['auto-download-lisk-core-v4'];
			const autoStartLiskCoreV4 = flags['auto-start-lisk-core-v4'];

			let config: ConfigV3;
			let networkConstant;

			cli.action.start(
				`Verifying snapshot height to be multiples of round length i.e ${ROUND_LENGTH}`,
			);
			if (snapshotHeight % ROUND_LENGTH !== 0) {
				this.error(`Invalid Snapshot Height: ${snapshotHeight}.`);
			}
			cli.action.stop('Snapshot Height is valid');

			const client = await getAPIClient(liskCorePath);
			const nodeInfo = await client.node.getNodeInfo();
			const { version: appVersion } = nodeInfo;

			if (autoStartLiskCoreV4) {
				networkConstant = NETWORK_CONSTANT[nodeInfo.networkIdentifier];
				if (!networkConstant) {
					this.error(
						`Unknown network detected. No NETWORK_CONSTANT defined for networkID: ${nodeInfo.networkIdentifier}.`,
					);
				}
			}

			cli.action.start('Verifying Lisk-Core version');
			const liskCoreVersion = semver.coerce(appVersion);
			if (!liskCoreVersion) {
				this.error(
					`Unsupported lisk-core version detected. Supported version range ${compatibleVersions}.`,
				);
			}
			if (!semver.satisfies(liskCoreVersion, compatibleVersions)) {
				this.error(
					`Lisk-Migrator utility is not compatible for lisk-core version ${liskCoreVersion.version}. Compatible versions range is: ${compatibleVersions}.`,
				);
			}
			cli.action.stop(`${liskCoreVersion.version} detected`);

			// User specified custom config file
			if (customConfigPath) {
				config = await getConfig(liskCorePath, customConfigPath);
			} else {
				config = await getConfig(liskCorePath);
			}

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
			await createSnapshot(liskCorePath, snapshotPath);
			cli.action.stop();

			await observeChainHeight({
				label: 'Waiting for snapshot height to be finalized',
				liskCorePath,
				height: snapshotHeight,
				delay: 500,
				isFinal: true,
			});

			const blockID = getBlockIDAtSnapshotHeight();
			const finalizedBlockID = await getBlockIDAtHeight(liskCorePath, snapshotHeight);

			cli.action.start('Verifying blockID');
			if (blockID !== finalizedBlockID) {
				this.error('Snapshotted blockID does not match with the finalized blockID.');
			}
			cli.action.stop();

			// TODO: Stop lisk core automatically when the application management is implemented

			// Create new DB instance based on the snapshot path
			cli.action.start('Creating database instance');
			const db = new KVStore(snapshotPath);
			cli.action.stop();

			// Create genesis assets
			cli.action.start('Creating genesis assets');
			const createAsset = new CreateAsset(db);
			const tokenID = getTokenIDLsk();
			const snapshotHeightPrevious = getHeightPreviousSnapshotBlock();
			const genesisAssets = await createAsset.init(snapshotHeight, snapshotHeightPrevious, tokenID);
			cli.action.stop();

			// Create an app instance for creating genesis block
			const configFilePath = await resolveConfigPathByNetworkID(nodeInfo.networkIdentifier);
			const configCoreV4 = await fs.readJSON(configFilePath);
			const { app } = await Application.defaultApplication(configCoreV4);

			cli.action.start('Creating genesis block');
			const blockAtSnapshotHeight = ((await client.block.getByHeight(
				snapshotHeight,
			)) as unknown) as Block;
			const genesisBlock = await createGenesisBlock(app, genesisAssets, blockAtSnapshotHeight);
			cli.action.stop();

			cli.action.start(`Exporting genesis block to the path ${outputPath}`);
			await writeGenesisBlock(genesisBlock, outputPath);
			cli.action.stop();

			if (autoMigrateUserConfig) {
				cli.action.start('Creating backup for old config');
				await createBackup(config);
				cli.action.stop();

				cli.action.start('Migrate user configuration');
				const configV4 = (await migrateUserConfig(
					config,
					liskCorePath,
					tokenID,
				)) as ApplicationConfig;
				cli.action.stop();

				cli.action.start('Validating migrated user configuration');
				const isValidConfig = await validateConfig(configV4);
				cli.action.stop();

				if (!isValidConfig) throw new Error('Migrated user configuration is invalid.');

				cli.action.start(`Exporting user configuration to the path: ${outputPath}`);
				await writeConfig(configV4, outputPath);
				cli.action.stop();
			}

			if (autoDownloadLiskCoreV4) {
				cli.action.start('Installing lisk-core v4');
				await installLiskCore();
				cli.action.stop();
			}

			if (autoStartLiskCoreV4) {
				cli.action.start('Starting lisk-core v4');
				try {
					const network = networkConstant?.name as string;
					await startLiskCore('PASS THE CONFIGURATION PATH', appVersion, client, { network });
				} catch (err) {
					this.error(`Failed to start lisk core v4. ${(err as { stack: string }).stack}`);
				}
				cli.action.stop();
			}
		} catch (error) {
			this.error(error as string);
		}
	}
}

export = LiskMigrator;
