/*
 * Copyright © 2023 Lisk Foundation
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
import cli from 'cli-ux';
import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import { Command } from '@oclif/command';
import { renameSync } from 'fs-extra';

import { PartialApplicationConfig } from 'lisk-framework';

import { execAsync } from './process';
import { copyDir, exists, getFiles } from './fs';
import { isPortAvailable } from './network';
import { resolveAbsolutePath } from './path';
import { Port } from '../types';
import { getAPIClient } from '../client';
import {
	DEFAULT_PORT_P2P,
	DEFAULT_PORT_RPC,
	ERROR_CODE,
	LEGACY_DB_PATH,
	SNAPSHOT_DIR,
	LISK_V3_BACKUP_DATA_DIR,
} from '../constants';
import { MigratorException } from './exception';

const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core@^4.0.0-rc.1';
const INSTALL_PM2_COMMAND = 'npm i -g pm2';
const PM2_FILE_NAME = 'pm2.migrator.config.json';

const REGEX = {
	INPUT_SEPARATOR: /[\s=]+/,
	FLAG: /^(?:-[a-z]|--[a-z]+(?:-[a-z]+)*$)/,
	NETWORK_FLAG: /^(?:-n|--network)/,
	OPTION_OR_VALUE: /=<(option|value)>$/,
};

let liskCoreStartCommand: string;

export const getLiskCoreStartCommand = (): string => liskCoreStartCommand;

export const installLiskCore = async (): Promise<string> => execAsync(INSTALL_LISK_CORE_COMMAND);

export const installPM2 = async (): Promise<string> => execAsync(INSTALL_PM2_COMMAND);

export const isLiskCoreV3Running = async (liskCorePath: string): Promise<boolean> => {
	try {
		const client = await getAPIClient(liskCorePath, true);
		const nodeInfo = await client.node.getNodeInfo();
		return !!nodeInfo;
	} catch (_) {
		return false;
	}
};

const backupLegacyDataDir = async (_this: Command, liskCoreV3DataPath: string) => {
	try {
		if (!liskCoreV3DataPath.includes('.lisk/lisk-core')) {
			fs.mkdirSync(`${homedir()}/.lisk`, { recursive: true });
		}

		_this.log(`Backing Lisk Core v3 data directory at ${liskCoreV3DataPath}`);
		renameSync(liskCoreV3DataPath, LISK_V3_BACKUP_DATA_DIR);
		_this.log(`Backed Lisk Core v3 data directory to: ${LISK_V3_BACKUP_DATA_DIR}`);
	} catch (err) {
		throw new MigratorException(
			`Unable to backup Lisk Core v3 data directory due to: ${(err as Error).message}`,
			ERROR_CODE.BACKUP_LEGACY_DATA_DIR,
		);
	}
};

const copyLegacyDB = async (_this: Command) => {
	try {
		_this.log(`Copying the v3.x snapshot to legacy.db at ${LEGACY_DB_PATH}`);
		await copyDir(
			path.resolve(LISK_V3_BACKUP_DATA_DIR, SNAPSHOT_DIR),
			resolveAbsolutePath(LEGACY_DB_PATH),
		);
		_this.log(`Legacy database for Lisk Core v4 has been created at ${LEGACY_DB_PATH}`);
	} catch (err) {
		throw new MigratorException(
			`Unable to copy ${path.basename(LEGACY_DB_PATH)} due to: ${(err as Error).message}`,
			ERROR_CODE.COPY_LEGACY_DB,
		);
	}
};

export const getFinalConfigPath = async (outputDir: string, network: string) =>
	(await exists(`${outputDir}/config.json`))
		? outputDir
		: path.resolve(__dirname, '../..', 'config', network);

export const validateStartCommandFlags = async (
	allowedFlags: string[],
	userInputString: string,
): Promise<boolean> => {
	try {
		let isOptionOrValueExpected = false;

		const userInputs = userInputString.split(REGEX.INPUT_SEPARATOR);
		for (let i = 0; i < userInputs.length; i += 1) {
			const input = userInputs[i];

			// Since network is determined automatically, user shouldn't pass the network flag
			if (REGEX.NETWORK_FLAG.test(input)) return false;

			if (REGEX.FLAG.test(input)) {
				const correspondingFlag = allowedFlags.find(f => f.includes(input));

				// If unknown flag specified or expected a value for prev flag or if no value provided when expected
				if (!correspondingFlag || isOptionOrValueExpected || i === userInputs.length - 1) {
					return false;
				}

				if (REGEX.OPTION_OR_VALUE.test(correspondingFlag)) {
					isOptionOrValueExpected = true;
				}
			} else if (isOptionOrValueExpected) {
				isOptionOrValueExpected = false;
			} else {
				return false;
			}
		}

		return true;
	} catch (error) {
		return false;
	}
};

const resolveLiskCoreStartCommand = async (_this: Command, network: string, configPath: string) => {
	const isUserConfirmed = await cli.confirm(
		'Would you like to customize the Lisk Core v4 start command? [yes/no]',
	);

	const baseStartCommand = `lisk core start --network ${network}`;

	if (!isUserConfirmed) {
		const defaultStartCommand = `${baseStartCommand} --config ${configPath}/config.json`;
		liskCoreStartCommand = defaultStartCommand;
		return defaultStartCommand;
	}

	// Let user customize the start command
	let customStartCommand = baseStartCommand;

	_this.log('Customizing Lisk Core start command');
	let userInput = await cli.prompt(
		"Please provide the Lisk Core start command flags (e.g. --api-ws), except the '--network (-n)' flag:",
	);

	const command = "lisk-core start --help | grep -- '^\\s\\+-' | cut -d ' ' -f 3,4";
	const allowedFlags = await execAsync(command);
	const allowedFlagsArray = allowedFlags.split(/\n+/).filter(e => !!e);

	let numTriesLeft = 3;
	while (numTriesLeft) {
		numTriesLeft -= 1;

		const isValid = await validateStartCommandFlags(allowedFlagsArray, userInput);
		if (isValid) {
			/* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */
			customStartCommand = `${baseStartCommand} ${userInput}`;
			break;
		}

		if (numTriesLeft >= 0) {
			userInput = await cli.prompt(
				"Invalid flags passed. Please provide the Lisk Core start command flags (e.g. --api-ws), except the '--network (-n)' flag again:",
			);
		} else {
			throw new Error(
				'Invalid Lisk Core start command flags provided. Cannot proceed with Lisk Core v4 auto-start. Please continue manually. Exiting!!!',
			);
		}
	}

	liskCoreStartCommand = customStartCommand;
	return customStartCommand;
};

export const startLiskCore = async (
	_this: Command,
	liskCoreV3DataPath: string,
	_config: PartialApplicationConfig,
	network: string,
	outputDir: string,
): Promise<void | Error> => {
	try {
		const networkPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_P2P;
		if (!(await isPortAvailable(networkPort))) {
			throw new Error(`Port ${networkPort} is not available for P2P communication.`);
		}

		const rpcPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_RPC;
		if (!(await isPortAvailable(rpcPort))) {
			throw new Error(`Port ${rpcPort} is not available to start the RPC server.`);
		}

		// Backup Lisk Core v3 data directory and legacy snapshot into the Core v4 legacy.db
		await backupLegacyDataDir(_this, liskCoreV3DataPath);
		await copyLegacyDB(_this);

		const configPath = await getFinalConfigPath(outputDir, network);

		const pm2Config = {
			name: 'lisk-core-v4',
			script: await resolveLiskCoreStartCommand(_this, network, configPath),
		};

		const isUserConfirmed = await cli.confirm(
			`Start Lisk Core with the following pm2 configuration? [yes/no]\n${JSON.stringify(
				pm2Config,
				null,
				'\t',
			)}`,
		);

		if (!isUserConfirmed) {
			_this.error(
				'User did not confirm to start Lisk Core v4 with the customized PM2 config. Skipping the Lisk Core v4 auto-start process. Please start the node manually.',
			);
		}

		_this.log('Installing PM2...');
		await installPM2();
		_this.log('Finished installing PM2.');

		const pm2FilePath = path.resolve(outputDir, PM2_FILE_NAME);
		_this.log(`Creating PM2 config at ${pm2FilePath}`);
		fs.writeFileSync(pm2FilePath, JSON.stringify(pm2Config, null, '\t'));
		_this.log(`Successfully created the PM2 config at ${pm2FilePath}`);

		const PM2_COMMAND_START = `pm2 start ${pm2FilePath}`;
		_this.log(await execAsync(PM2_COMMAND_START));
	} catch (err) {
		throw new MigratorException(
			`${(err as Error).message}`,
			err instanceof MigratorException ? err.code : ERROR_CODE.LISK_CORE_START,
		);
	}
};

export const resolveSnapshotPath = async (
	useSnapshot: boolean,
	snapshotPath: string,
	dataDir: string,
	liskCoreV3DataPath: string,
) => {
	if (!useSnapshot) return path.join(liskCoreV3DataPath, SNAPSHOT_DIR);
	if (!snapshotPath.endsWith('.tar.gz')) return snapshotPath;

	const [snapshotDirNameExtracted] = (await getFiles(dataDir)) as string[];
	const snapshotFilePathExtracted = path.join(dataDir, snapshotDirNameExtracted);
	return snapshotFilePathExtracted;
};
