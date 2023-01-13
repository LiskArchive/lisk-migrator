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
import { Port } from '../types';
import { isPortAvailable } from './network';
import { execAsync } from './process';

const INSTALL_LISK_CORE_COMMAND = 'npm i -g lisk-core';

export const installLiskCore = async (): Promise<string> => execAsync(INSTALL_LISK_CORE_COMMAND);

// Export for testing
export const isAppVersion3 = (version: string): boolean =>
	version.length > 0 && version.startsWith('3');

export const startLiskCore = async (
	_config: any,
	previousLiskCoreVersion: string,
	params: { network: string },
): Promise<string | Error> => {
	if (isAppVersion3(previousLiskCoreVersion)) {
		throw new Error('Lisk core V3 is still running!');
	}

	// Figureout required port from the config path
	const requiredPort: Port = 0;
	if (!(await isPortAvailable(requiredPort))) {
		throw new Error(`Required port is not available! required port:${requiredPort}`);
	}

	return execAsync(`lisk-core start --network ${params.network} --api-ipc --log info`);
};
