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
import util from 'util';
import * as fs from 'fs-extra';
import { join, resolve } from 'path';
import { ApplicationConfig, PartialApplicationConfig } from 'lisk-framework';
import { Database } from '@liskhq/lisk-db';
import * as semver from 'semver';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { Block } from '@liskhq/lisk-chain';
import {
	NETWORK_CONSTANT,
	ROUND_LENGTH,
	SNAPSHOT_DIR,
	MIN_SUPPORTED_LISK_CORE_VERSION,
	DEFAULT_LISK_CORE_PATH,
	SNAPSHOT_TIME_GAP,
	LEGACY_DB_PATH,
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
	getTokenIDLsk,
	getPrevSnapshotBlockHeight,
	setTokenIDLskByNetID,
	setPrevSnapshotBlockHeightByNetID,
} from './utils/chain';
import { captureForgingStatusAtSnapshotHeight } from './events';
import { copyGenesisBlock, createGenesisBlock, writeGenesisAssets } from './utils/genesis_block';
import { CreateAsset } from './createAsset';
import { ApplicationConfigV3, NetworkConfigLocal, NodeInfo } from './types';
import { installLiskCore, startLiskCore } from './utils/node';
import { copyDir, resolveAbsolutePath } from './utils/fs';
import { execAsync } from './utils/process';

let configCoreV4: PartialApplicationConfig;
class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),

		output: flagsParser.string({
			char: 'o',
			required: false,
			description:
				'File path to write the genesis block json. If not provided, it will default to cwd/genesis_block.json.',
		}),
		'lisk-core-v3-data-path': flagsParser.string({
			char: 'd',
			required: false,
			description:
				'Path where the lisk-core v3.x instance is running. The current home directory will be considered the default directory if not otherwise provided.',
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
		'auto-start-lisk-core-v4': flagsParser.boolean({
			required: false,
			env: 'AUTO_START_LISK_CORE',
			description: 'Start lisk core v4 automatically. Default to false.',
			default: false,
		}),
	};

	public async run(): Promise<void> {
		try {
			const { flags } = this.parse(LiskMigrator);
			const liskCoreV3DataPath = resolveAbsolutePath(
				flags['lisk-core-v3-data-path'] ?? DEFAULT_LISK_CORE_PATH,
			);
			const outputPath = flags.output ?? join(__dirname, '..', 'output');
			const snapshotHeight = flags['snapshot-height'];
			const customConfigPath = flags.config;
			const autoMigrateUserConfig = flags['auto-migrate-config'] ?? false;
			const autoStartLiskCoreV4 = flags['auto-start-lisk-core-v4'];
			const snapshotTimeGap = Number(flags['snapshot-time-gap'] ?? SNAPSHOT_TIME_GAP);

			const client = await getAPIClient(liskCoreV3DataPath);
			const nodeInfo = (await client.node.getNodeInfo()) as NodeInfo;
			const { version: appVersion, networkIdentifier } = nodeInfo;

			cli.action.start('Verifying if backup height from node config matches snapshot height');
			if (snapshotHeight !== nodeInfo.backup.height) {
				this.error(
					`Snapshot height ${snapshotHeight} does not matches backup height ${nodeInfo.backup.height}.`,
				);
			}
			cli.action.stop('Snapshot height matches backup height');

			cli.action.start(
				`Verifying snapshot height to be multiples of round length i.e ${ROUND_LENGTH}`,
			);
			if (snapshotHeight % ROUND_LENGTH !== 0) {
				this.error(`Invalid Snapshot Height: ${snapshotHeight}.`);
			}
			cli.action.stop('Snapshot height is valid');

			const networkConstant = NETWORK_CONSTANT[networkIdentifier] as NetworkConfigLocal;
			const outputDir = `${outputPath}/${networkIdentifier}`;

			captureForgingStatusAtSnapshotHeight(this, client, snapshotHeight, outputDir);

			if (autoStartLiskCoreV4) {
				if (!networkConstant) {
					this.error(
						`Unknown network detected. No NETWORK_CONSTANT defined for networkID: ${networkIdentifier}.`,
					);
				}
			}

			cli.action.start('Verifying Lisk Core version');
			const liskCoreVersion = semver.coerce(appVersion);
			if (!liskCoreVersion) {
				this.error(
					`Unsupported lisk-core version detected. Supported version range ${MIN_SUPPORTED_LISK_CORE_VERSION}.`,
				);
			}
			if (!semver.gte(MIN_SUPPORTED_LISK_CORE_VERSION, liskCoreVersion)) {
				this.error(
					`Lisk Migrator utility is not compatible for lisk-core version ${liskCoreVersion.version}. The minimum compatible version is: ${MIN_SUPPORTED_LISK_CORE_VERSION}.`,
				);
			}
			cli.action.stop(`${liskCoreVersion.version} detected`);

			// User specified custom config file
			const configV3: ApplicationConfigV3 = customConfigPath
				? await getConfig(liskCoreV3DataPath, customConfigPath)
				: await getConfig(liskCoreV3DataPath);

			await setTokenIDLskByNetID(networkIdentifier);
			await setPrevSnapshotBlockHeightByNetID(networkIdentifier);

			await observeChainHeight({
				label: 'Waiting for snapshot height to be finalized',
				liskCoreV3DataPath,
				height: snapshotHeight,
				delay: 500,
				isFinal: true,
			});

			// Create new DB instance based on the snapshot path
			cli.action.start('Creating database instance');
			const snapshotDirPath = join(liskCoreV3DataPath, SNAPSHOT_DIR);
			const db = new Database(snapshotDirPath);
			cli.action.stop();

			// Create genesis assets
			cli.action.start('Creating genesis assets');
			const createAsset = new CreateAsset(db);
			const tokenID = getTokenIDLsk();
			const prevSnapshotBlockHeight = getPrevSnapshotBlockHeight();
			const genesisAssets = await createAsset.init(
				snapshotHeight,
				prevSnapshotBlockHeight,
				tokenID,
			);
			cli.action.stop();

			// Create an app instance for creating genesis block
			const defaultConfigFilePath = await resolveConfigPathByNetworkID(networkIdentifier);
			const defaultConfigV4 = await fs.readJSON(defaultConfigFilePath);

			cli.action.start(`Exporting genesis block to the path ${outputDir}`);
			await writeGenesisAssets(genesisAssets, outputDir);
			cli.action.stop();

			if (autoMigrateUserConfig) {
				cli.action.start('Creating backup for old config');
				await createBackup(configV3);
				cli.action.stop();

				cli.action.start('Migrating user configuration');
				const migratedConfigV4 = (await migrateUserConfig(
					configV3,
					defaultConfigV4,
					snapshotHeight,
				)) as ApplicationConfig;
				cli.action.stop();

				cli.action.start('Validating migrated user configuration');
				const isValidConfig = await validateConfig(migratedConfigV4);
				cli.action.stop();

				if (!isValidConfig) throw new Error('Migrated user configuration is invalid.');

				cli.action.start(`Exporting user configuration to the path: ${outputDir}`);
				await writeConfig(migratedConfigV4, outputDir);
				cli.action.stop();

				// Set configCoreV4 to the migrated Core config
				configCoreV4 = migratedConfigV4 as PartialApplicationConfig;
			}

			cli.action.start('Installing lisk-core v4');
			await installLiskCore();
			cli.action.stop();

			cli.action.start('Creating genesis block');
			const blockAtSnapshotHeight = ((await client.block.getByHeight(
				snapshotHeight,
			)) as unknown) as Block;
			await createGenesisBlock(
				networkConstant.name,
				defaultConfigFilePath,
				outputDir,
				blockAtSnapshotHeight,
				snapshotTimeGap,
			);
			cli.action.stop();

			if (autoStartLiskCoreV4) {
				try {
					if (!autoMigrateUserConfig) {
						configCoreV4 = defaultConfigV4;
					}

					cli.action.start('Copying genesis block to the Lisk Core executable directory');
					const liskCoreExecPath = await execAsync('which lisk-core');
					const liskCoreV4ConfigPath = resolve(
						liskCoreExecPath,
						'../..',
						`lib/node_modules/lisk-core/config/${networkConstant.name}`,
					);

					await copyGenesisBlock(
						`${outputDir}/genesis_block.blob`,
						`${liskCoreV4ConfigPath}/genesis_block.blob`,
					);
					this.log(`Genesis block has been copied to: ${liskCoreV4ConfigPath}`);
					cli.action.stop();

					cli.action.start(`Creating legacy.db at ${LEGACY_DB_PATH}`);
					await copyDir(snapshotDirPath, resolveAbsolutePath(LEGACY_DB_PATH));
					this.log(`Legacy database has been created at ${LEGACY_DB_PATH}`);
					cli.action.stop();

					// Ask user to manually stop Lisk Core v3 and continue
					const isLiskCoreV3Stopped = await cli.confirm(`
					Please stop Lisk Core v3 to continue. Type 'yes' and press Enter when ready. [yes/no]`);

					if (isLiskCoreV3Stopped) {
						const isUserConfirmed = await cli.confirm(`
						Start Lisk Core with the following configuration? [yes/no] \n
						${util.inspect(configCoreV4, false, 3)}`);

						if (isUserConfirmed) {
							cli.action.start('Starting lisk-core v4');
							const network = networkConstant.name as string;
							await startLiskCore(this, liskCoreV3DataPath, configCoreV4, network, outputDir);
							this.log('Started Lisk Core v4 at default data directory.');
							cli.action.stop();
						} else {
							this.log(
								'User did not accept the migrated config. Skipping the Lisk Core v4 auto-start process.',
							);
						}
					} else {
						this.log(
							'User did not confirm Lisk Core v3 node shutdown. Skipping the Lisk Core v4 auto-start process.',
						);
					}
				} catch (err) {
					/* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */
					this.error(`Failed to auto-start Lisk Core v4.\nError: ${err}`);
				}
			} else {
				this.log(
					`Please copy ${snapshotDirPath} directory to the Lisk Core V4 data directory in order to access legacy blockchain information`,
				);
			}
		} catch (error) {
			this.error(error as string);
		}

		this.log('Successfully finished migration. Exiting!!!');
		process.exit(0);
	}
}

export = LiskMigrator;
