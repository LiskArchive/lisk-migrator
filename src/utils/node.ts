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
import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import { Command } from '@oclif/command';
import { existsSync, renameSync } from 'fs-extra';
import { PartialApplicationConfig } from 'lisk-framework';

import { execAsync } from './process';
import { isPortAvailable } from './network';
import { Port } from '../types';
import { getAPIClient } from '../client';
import { DEFAULT_PORT_P2P, DEFAULT_PORT_RPC, LEGACY_DB_PATH, SNAPSHOT_DIR } from '../constants';
import { copyDir, exists, resolveAbsolutePath } from './fs';

const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core@^4.0.0-rc.1';
const INSTALL_PM2_COMMAND = 'npm i -g pm2';
const PM2_FILE_NAME = 'pm2.migrator.config.json';

const LISK_V3_BACKUP_DATA_DIR = `${homedir()}/.lisk/lisk-core-v3`;

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

const backupDefaultDirectoryIfExists = async (_this: Command, liskCoreV3DataPath: string) => {
	if (existsSync(liskCoreV3DataPath)) {
		if (!liskCoreV3DataPath.includes('.lisk/lisk-core')) {
			fs.mkdirSync(`${homedir()}/.lisk`, { recursive: true });
		}

		_this.log(`Backing Lisk Core v3 data directory at ${liskCoreV3DataPath}`);
		renameSync(liskCoreV3DataPath, LISK_V3_BACKUP_DATA_DIR);
		_this.log(`Backed Lisk Core v3 data directory to: ${LISK_V3_BACKUP_DATA_DIR}`);
	}
};

const copyLegacyDB = async (_this: Command) => {
	_this.log(`Copying the v3.x snapshot to legacy.db at ${LEGACY_DB_PATH}`);
	await copyDir(
		path.resolve(LISK_V3_BACKUP_DATA_DIR, SNAPSHOT_DIR),
		resolveAbsolutePath(LEGACY_DB_PATH),
	);
	_this.log(`Legacy database for Lisk Core v4 has been created at ${LEGACY_DB_PATH}`);
};

const getFinalConfigPath = async (outputDir: string, network: string) =>
	(await exists(`${outputDir}/config.json`))
		? outputDir
		: path.resolve(__dirname, '../..', 'config', network);

export const startLiskCore = async (
	_this: Command,
	liskCoreV3DataPath: string,
	_config: PartialApplicationConfig,
	network: string,
	outputDir: string,
): Promise<void | Error> => {
	const networkPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_P2P;
	if (!(await isPortAvailable(networkPort))) {
		throw new Error(`Port ${networkPort} is not available for P2P communication.`);
	}

	const rpcPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_RPC;
	if (!(await isPortAvailable(rpcPort))) {
		throw new Error(`Port ${rpcPort} is not available to start the RPC server.`);
	}

	await backupDefaultDirectoryIfExists(_this, liskCoreV3DataPath);
	await copyLegacyDB(_this);

	_this.log('Installing pm2...');
	await installPM2();
	_this.log('Finished installing pm2.');

	const pm2FilePath = path.resolve(outputDir, PM2_FILE_NAME);
	_this.log(`Creating PM2 config at ${pm2FilePath}`);
	const configPath = await getFinalConfigPath(outputDir, network);
	fs.writeFileSync(
		pm2FilePath,
		JSON.stringify(
			{
				name: 'lisk-core-v4',
				script: `lisk-core start --network ${network} --config ${configPath}/config.json`,
			},
			null,
			'\t',
		),
	);
	_this.log(`Successfully created the PM2 config at ${pm2FilePath}`);

	const PM2_COMMAND_START = `pm2 start ${pm2FilePath}`;
	_this.log(await execAsync(PM2_COMMAND_START));
};
