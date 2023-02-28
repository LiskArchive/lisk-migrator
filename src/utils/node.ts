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
import { PartialApplicationConfig } from 'lisk-framework';
import { Port } from '../types';
import { isPortAvailable } from './network';
import { execAsync } from './process';
import { getAPIClient } from '../client';

const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core';

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

export const startLiskCore = async (
	_config: PartialApplicationConfig,
	_previousLiskCoreVersion: string,
	liskCorePath: string,
	params: { network: string },
): Promise<string | Error> => {
	const isCoreV3Running = await isLiskCoreV3Running(liskCorePath);
	if (isCoreV3Running) throw new Error('Lisk Core v3 is still running');

	// TODO: Figure out required port from the config
	const requiredPort: Port = 0;
	if (!(await isPortAvailable(requiredPort))) {
		throw new Error(`Required port is not available! required port:${requiredPort}`);
	}

	return execAsync(`lisk-core start --network ${params.network} --api-ipc --log info`);
};
