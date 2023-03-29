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
import { Application, ApplicationConfig, PartialApplicationConfig } from 'lisk-framework';
import { KVStore } from '@liskhq/lisk-db';
import * as semver from 'semver';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { Block } from '@liskhq/lisk-chain';
import {
	NETWORK_CONSTANT,
	ROUND_LENGTH,
	DEFAULT_DATA_DIR,
	EXTRACTED_SNAPSHOT_DIR,
} from './constants';
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
	getHeightPrevSnapshotBlock,
	setTokenIDLskByNetID,
	setHeightPrevSnapshotBlockByNetID,
} from './utils/chain';
import { createGenesisBlock, writeGenesisBlock } from './utils/genesis_block';
import { CreateAsset } from './createAsset';
import { ConfigV3, NetworkConfigLocal } from './types';
import { installLiskCore, startLiskCore } from './utils/node';
import { extractTarBall } from './utils/fs';

let finalConfigCorev4: PartialApplicationConfig;

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
		// TODO: Remove once createSnapshot command is available
		'use-existing-snapshot': flagsParser.boolean({
			required: false,
			env: 'USE_EXISTING_SNAPSHOT',
			description:
				'Use existing database snapshot (Temporary flag, will be removed once createSnapshot command is available on Lisk Core).',
			default: false,
		}),
	};

	public async run(): Promise<void> {
		try {
			const { flags } = this.parse(LiskMigrator);
			const liskCorePath = flags['lisk-core-path'] ?? process.cwd();
			const outputPath = flags.output ?? join(__dirname, '..', 'output');
			const snapshotHeight = flags['snapshot-height'];
			const customConfigPath = flags.config;
			const autoMigrateUserConfig = flags['auto-migrate-config'] ?? false;
			const compatibleVersions = flags['min-compatible-version'];
			const useExistingSnapshot = flags['use-existing-snapshot'];
			const snapshotPath = ((useExistingSnapshot
				? flags['snapshot-path']
				: flags['snapshot-path'] ?? process.cwd()) as unknown) as string;
			const autoDownloadLiskCoreV4 = flags['auto-download-lisk-core-v4'];
			const autoStartLiskCoreV4 = flags['auto-start-lisk-core-v4'];

			if (useExistingSnapshot) {
				if (snapshotPath) {
					if (!snapshotPath.endsWith('.tar.gz')) {
						this.error('Snapshot should always end with ".tar.gz"');
					}
				} else {
					this.error("Snapshot path is required when 'use-existing-snapshot' set to true");
				}
			}

			const dataDir = join(__dirname, '..', DEFAULT_DATA_DIR);
			cli.action.start(`Extracting snapshot at ${dataDir}`);
			await extractTarBall(snapshotPath, dataDir);
			cli.action.stop();

			cli.action.start(
				`Verifying snapshot height to be multiples of round length i.e ${ROUND_LENGTH}`,
			);
			if (snapshotHeight % ROUND_LENGTH !== 0) {
				this.error(`Invalid Snapshot Height: ${snapshotHeight}.`);
			}
			cli.action.stop('Snapshot Height is valid');

			const client = await getAPIClient(liskCorePath);
			const nodeInfo = await client.node.getNodeInfo();
			const { version: appVersion, networkIdentifier } = nodeInfo;

			const networkConstant = NETWORK_CONSTANT[networkIdentifier] as NetworkConfigLocal;
			const networkDir = `${outputPath}/${networkIdentifier}`;

			if (autoStartLiskCoreV4) {
				if (!networkConstant) {
					this.error(
						`Unknown network detected. No NETWORK_CONSTANT defined for networkID: ${networkIdentifier}.`,
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
			const config: ConfigV3 = customConfigPath
				? await getConfig(liskCorePath, customConfigPath)
				: await getConfig(liskCorePath);

			await setTokenIDLskByNetID(networkIdentifier);
			await setHeightPrevSnapshotBlockByNetID(networkIdentifier);

			if (!useExistingSnapshot) {
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
			}

			// TODO: Stop Lisk Core v3 automatically when the application management is implemented

			// Create new DB instance based on the snapshot path
			cli.action.start('Creating database instance');
			const snapshotFilePathExtracted = join(dataDir, EXTRACTED_SNAPSHOT_DIR);
			const db = new KVStore(snapshotFilePathExtracted);
			cli.action.stop();

			// Create genesis assets
			cli.action.start('Creating genesis assets');
			const createAsset = new CreateAsset(db);
			const tokenID = getTokenIDLsk();
			const snapshotHeightPrevious = getHeightPrevSnapshotBlock();
			const genesisAssets = await createAsset.init(snapshotHeight, snapshotHeightPrevious, tokenID);
			cli.action.stop();

			// Create an app instance for creating genesis block
			const configFilePath = await resolveConfigPathByNetworkID(networkIdentifier);
			const configCoreV4 = await fs.readJSON(configFilePath);
			const { app } = await Application.defaultApplication(configCoreV4);

			cli.action.start('Creating genesis block');
			const blockAtSnapshotHeight = ((await client.block.getByHeight(
				snapshotHeight,
			)) as unknown) as Block;
			const genesisBlock = await createGenesisBlock(app, genesisAssets, blockAtSnapshotHeight);
			cli.action.stop();

			cli.action.start(`Exporting genesis block to the path ${networkDir}`);
			await writeGenesisBlock(genesisBlock, networkDir);
			cli.action.stop();

			if (autoMigrateUserConfig) {
				cli.action.start('Creating backup for old config');
				await createBackup(config);
				cli.action.stop();

				cli.action.start('Migrate user configuration');
				const migratedConfigV4 = (await migrateUserConfig(
					config,
					liskCorePath,
					tokenID,
				)) as ApplicationConfig;
				cli.action.stop();

				cli.action.start('Validating migrated user configuration');
				const isValidConfig = await validateConfig(migratedConfigV4);
				cli.action.stop();

				if (!isValidConfig) throw new Error('Migrated user configuration is invalid.');

				cli.action.start(`Exporting user configuration to the path: ${networkDir}`);
				await writeConfig(migratedConfigV4, networkDir);
				cli.action.stop();

				// Set finalConfigCorev4 to the migrated Core config
				finalConfigCorev4 = migratedConfigV4 as PartialApplicationConfig;
			}

			if (autoDownloadLiskCoreV4) {
				cli.action.start('Installing lisk-core v4');
				await installLiskCore();
				cli.action.stop();
			}

			if (autoStartLiskCoreV4) {
				cli.action.start('Starting lisk-core v4');
				try {
					// TODO: Verify and update the implementation
					// If finalConfigCorev4 is not set to the migrated config use the default config
					if (!autoMigrateUserConfig) {
						finalConfigCorev4 = configCoreV4;
					}
					const network = networkConstant.name as string;
					await startLiskCore(this, finalConfigCorev4, appVersion, liskCorePath, network);
					this.log('Started Lisk Core v4 at default data directory.');
				} catch (err) {
					this.error(`Failed to start Lisk Core v4. ${(err as { stack: string }).stack}`);
				}
				cli.action.stop();
			}
		} catch (error) {
			this.error(error as string);
		}

		this.log('Successfully finished migration. Exiting!!!');
		process.exit(0);
	}
}

export = LiskMigrator;
