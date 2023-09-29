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
	setTokenIDLskByNetID,
	setPrevSnapshotBlockHeightByNetID,
} from './utils/chain';
import { captureForgingStatusAtSnapshotHeight } from './events';
import { copyGenesisBlock, createGenesisBlock, writeGenesisAssets } from './utils/genesis_block';
import { CreateAsset } from './createAsset';
import { ApplicationConfigV3, NetworkConfigLocal, NodeInfo } from './types';
import { installLiskCore, startLiskCore, isLiskCoreV3Running } from './utils/node';
import { resolveAbsolutePath, verifyOutputPath } from './utils/path';
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
			description: `File path to write the genesis block. If not provided, it will default to cwd/output/{v3_networkIdentifier}/genesis_block.blob. Do not use any value starting with the default data path reserved for Lisk Core: '${DEFAULT_LISK_CORE_PATH}'.`,
		}),
		'lisk-core-v3-data-path': flagsParser.string({
			char: 'd',
			required: false,
			description:
				'Path where the Lisk Core v3.x instance is running. When not supplied, defaults to the default data directory for Lisk Core.',
		}),
		config: flagsParser.string({
			char: 'c',
			required: false,
			description: 'Custom configuration file path for Lisk Core v3.x.',
		}),
		'snapshot-height': flagsParser.integer({
			char: 's',
			required: true,
			env: 'SNAPSHOT_HEIGHT',
			description:
				'The height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.',
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
		'page-size': flagsParser.integer({
			char: 'p',
			required: false,
			default: 100000,
			description:
				'Maximum number of blocks to be iterated at once for computation. Default to 100000.',
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
			const pageSize = Number(flags['page-size']);

			verifyOutputPath(outputPath);

			const client = await getAPIClient(liskCoreV3DataPath);
			const nodeInfo = (await client.node.getNodeInfo()) as NodeInfo;
			const { version: appVersion, networkIdentifier } = nodeInfo;

			cli.action.start('Verifying if backup height from node config matches snapshot height');
			if (snapshotHeight !== nodeInfo.backup.height) {
				this.error(
					`Lisk Core v3 backup height (${nodeInfo.backup.height}) does not match the expected snapshot height (${snapshotHeight}).`,
				);
			}
			cli.action.stop('Snapshot height matches backup height');

			cli.action.start(
				`Verifying snapshot height to be multiples of round length i.e ${ROUND_LENGTH}`,
			);
			if (snapshotHeight % ROUND_LENGTH !== 0) {
				this.error(
					`Invalid snapshot height provided: ${snapshotHeight}. It must be an exact multiple of round length (${ROUND_LENGTH}).`,
				);
			}
			cli.action.stop('Snapshot height is valid');

			const networkConstant = NETWORK_CONSTANT[networkIdentifier] as NetworkConfigLocal;
			const outputDir = flags.output ? outputPath : `${outputPath}/${networkIdentifier}`;

			// Ensure the output directory is present
			if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

			// Asynchronously capture the node's Forging Status information at the snapshot height
			// This information is necessary for the node operators to enable generator post-migration without getting PoM'd
			captureForgingStatusAtSnapshotHeight(this, client, snapshotHeight, outputDir);

			if (autoStartLiskCoreV4) {
				if (!networkConstant) {
					this.error(
						`Unknown network detected. No NETWORK_CONSTANT defined for networkID: ${networkIdentifier}.`,
					);
				}
			}

			cli.action.start('Verifying Lisk Core version');
			const isLiskCoreVersionValid = semver.valid(appVersion);
			if (isLiskCoreVersionValid === null) {
				this.error(
					`Invalid Lisk Core version detected: ${appVersion}. Minimum supported version is ${MIN_SUPPORTED_LISK_CORE_VERSION}.`,
				);
			}

			// Using 'gt' instead of 'gte' because the behavior is swapped
			// i.e. 'gt' acts as 'gte' and vice-versa
			if (semver.gt(`${MIN_SUPPORTED_LISK_CORE_VERSION}-rc.0`, appVersion)) {
				this.error(
					`Lisk Migrator is not compatible with Lisk Core version ${appVersion}. Minimum supported version is ${MIN_SUPPORTED_LISK_CORE_VERSION}.`,
				);
			}
			cli.action.stop(`${appVersion} detected`);

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
			const genesisAssets = await createAsset.init(snapshotHeight, tokenID, pageSize);
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

			cli.action.start('Installing Lisk Core v4');
			await installLiskCore();
			cli.action.stop();

			cli.action.start('Creating genesis block');
			const blockAtSnapshotHeight = ((await client.block.getByHeight(
				snapshotHeight,
			)) as unknown) as Block;
			await createGenesisBlock(
				this,
				networkConstant.name,
				defaultConfigFilePath,
				outputDir,
				blockAtSnapshotHeight,
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
					this.log(`Genesis block has been copied to: ${liskCoreV4ConfigPath}.`);
					cli.action.stop();

					// Ask user to manually stop Lisk Core v3 and continue
					const isLiskCoreV3Stopped = await cli.confirm(
						"Please stop Lisk Core v3 to continue. Type 'yes' and press Enter when ready. [yes/no] ",
					);

					if (isLiskCoreV3Stopped) {
						let numTriesLeft = 3;
						// eslint-disable-next-line no-plusplus
						while (numTriesLeft--) {
							const isCoreV3Running = await isLiskCoreV3Running(liskCoreV3DataPath);
							if (isCoreV3Running) {
								if (numTriesLeft) {
									const isStopReconfirmed = await cli.confirm(
										"Lisk Core v3 still running. Please stop the node, type 'yes' to proceed and 'no' to exit. [yes/no] ",
									);
									if (!isStopReconfirmed) {
										this.log(
											'Cannot proceed with Lisk Core v4 auto-start. Please continue manually.  Exiting!!!',
										);
										process.exit(0);
									}
								} else {
									this.error(
										'Cannot auto-start Lisk Core v4 as Lisk Core v3 is still running. Exiting!!!',
									);
								}
							} else {
								break;
							}
						}

						const isUserConfirmed = await cli.confirm(
							`Start Lisk Core with the following configuration? [yes/no]
							${util.inspect(configCoreV4, false, 3)} `,
						);

						if (isUserConfirmed) {
							cli.action.start('Starting Lisk Core v4');
							const network = networkConstant.name as string;
							await startLiskCore(this, liskCoreV3DataPath, configCoreV4, network, outputDir);
							this.log(
								`Started Lisk Core v4 at default data directory ('${DEFAULT_LISK_CORE_PATH}').`,
							);
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
					`Please copy the contents of ${snapshotDirPath} directory to 'data/legacy.db' under the Lisk Core V4 data directory (e.g: ${DEFAULT_LISK_CORE_PATH}/data/legacy.db/) in order to access legacy blockchain information.`,
				);
				this.log('Please copy genesis block to the Lisk Core V4 network directory.');
			}
		} catch (error) {
			this.error(error as string);
		}

		this.log('Successfully finished migration. Exiting!!!');
		process.exit(0);
	}
}

export = LiskMigrator;
