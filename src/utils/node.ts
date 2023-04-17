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
import { homedir } from 'os';
import { Command } from '@oclif/command';
import { existsSync, renameSync } from 'fs-extra';
import { PartialApplicationConfig } from 'lisk-framework';

import { execAsync } from './process';
import { isPortAvailable } from './network';
import { Port } from '../types';
import { getAPIClient } from '../client';
import { DEFAULT_PORT_P2P, DEFAULT_PORT_RPC } from '../constants';

// TODO: Remove custom registry after Lisk Core is published to public NPM registry
const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core --registry https://npm.lisk.com';

const DEFAULT_LISK_DATA_DIR = `${homedir()}/.lisk/lisk-core`;
const LISK_V3_BACKUP_DATA_DIR = `${homedir()}/.lisk/lisk-core-v3`;

export const installLiskCore = async (): Promise<string> => execAsync(INSTALL_LISK_CORE_COMMAND);

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
	_config: PartialApplicationConfig,
	_previousLiskCoreVersion: string,
	liskCorePath: string,
	network: string,
): Promise<string | Error> => {
	await isLiskCoreV3Running(liskCorePath);
	const isCoreV3Running = await isLiskCoreV3Running(liskCorePath);
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

	return execAsync(`lisk-core start--network ${network} --api - ipc--log info`);
};
