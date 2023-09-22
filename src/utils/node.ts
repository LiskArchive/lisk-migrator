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
import { resolve } from 'path';
import * as fs from 'fs-extra';
import { homedir } from 'os';
import { Command } from '@oclif/command';
import { existsSync, renameSync } from 'fs-extra';
import { PartialApplicationConfig } from 'lisk-framework';

import { execAsync } from './process';
import { isPortAvailable } from './network';
import { Port } from '../types';
import { getAPIClient } from '../client';
import { DEFAULT_PORT_P2P, DEFAULT_PORT_RPC } from '../constants';

const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core@^4.0.0-rc.1';
const INSTALL_PM2_COMMAND = 'npm i -g pm2';
const PM2_FILE_NAME = 'pm2.migrator.config.json';
const START_PM2_COMMAND = `pm2 start ${PM2_FILE_NAME}`;

const DEFAULT_LISK_DATA_DIR = `${homedir()}/.lisk/lisk-core`;
const LISK_V3_BACKUP_DATA_DIR = `${homedir()}/.lisk/lisk-core-v3`;

export const installLiskCore = async (): Promise<string> => execAsync(INSTALL_LISK_CORE_COMMAND);

export const installPM2 = async (): Promise<string> => execAsync(INSTALL_PM2_COMMAND);

export const isLiskCoreV3Running = async (liskCorePath: string): Promise<boolean> => {
	try {
		const client = await getAPIClient(liskCorePath);
		const nodeInfo = await client.node.getNodeInfo();
		return !!nodeInfo;
	} catch (_) {
		return false;
	}
};

const backupDefaultDirectoryIfExists = async (_this: Command) => {
	if (existsSync(DEFAULT_LISK_DATA_DIR)) {
		_this.log(`Backing Lisk Core v3 data directory at ${DEFAULT_LISK_DATA_DIR}`);
		renameSync(DEFAULT_LISK_DATA_DIR, LISK_V3_BACKUP_DATA_DIR);
		_this.log(`Backed Lisk Core v3 data directory to: ${LISK_V3_BACKUP_DATA_DIR}`);
	}
};

export const startLiskCore = async (
	_this: Command,
	liskCoreV3DataPath: string,
	_config: PartialApplicationConfig,
	network: string,
	outputDir: string,
): Promise<string | Error> => {
	const isCoreV3Running = await isLiskCoreV3Running(liskCoreV3DataPath);
	if (isCoreV3Running) throw new Error('Lisk Core v3 is still running.');

	const networkPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_P2P;
	if (!(await isPortAvailable(networkPort))) {
		throw new Error(`Port ${networkPort} is not available for P2P communication.`);
	}

	const rpcPort = (_config?.network?.port as Port) ?? DEFAULT_PORT_RPC;
	if (!(await isPortAvailable(rpcPort))) {
		throw new Error(`Port ${rpcPort} is not available to start the RPC server.`);
	}

	await backupDefaultDirectoryIfExists(_this);

	_this.log('Installing pm2...');
	await installPM2();
	_this.log('Finished installing pm2.');

	const customConfigFilepath = resolve(outputDir, 'custom_config.json');

	fs.writeFileSync(
		customConfigFilepath,
		JSON.stringify(
			{
				..._config,
				genesis: {
					..._config.genesis,
					block: {
						fromFile: `${outputDir}/genesis_block.blob`,
					},
				},
			},
			null,
			'\t',
		),
	);

	fs.writeFileSync(
		PM2_FILE_NAME,
		JSON.stringify(
			{
				name: 'lisk-core',
				script: `lisk-core start --network ${network} --config ${customConfigFilepath}`,
			},
			null,
			'\t',
		),
	);

	return execAsync(START_PM2_COMMAND);
};
