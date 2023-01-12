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
import { exec } from 'child_process';
import { createServer } from 'net';

// Export for testing
export type Port = number;

// Export for testing
export const isPortAvailable = async (port: Port): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		const server = createServer();

		server.once('error', (err: { code: string }) => {
			if (err.code === 'EADDRINUSE') {
				// Port is currently in use
				resolve(false);
			} else {
				reject(err);
			}
		});

		server.once('listening', () => {
			// Close the server if listening doesn't fail
			server.close(() => resolve(true));
		});

		server.listen(port);
	});

// Export for testing
export const execAsync = async (cmd: string): Promise<string> =>
	new Promise((resolve, reject) => {
		exec(cmd, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});

export const installLiskCore = async (): Promise<string> => execAsync('npm i -g lisk-core');

// Export for testing
export const isLiskCoreV3Running = (version: string): boolean =>
	version.length > 0 && version.startsWith('3');

export const startLiskCore = async (
	configPath: string,
	perviousLiskCoreVersion: string,
): Promise<string | Error> => {
	if (isLiskCoreV3Running(perviousLiskCoreVersion)) {
		throw new Error('Lisk core V3 is still running!');
	}

	// TODO: Remove this line
	configPath.slice();
	// Figureout required port from the config path
	const requiredPort: Port = 0;
	if (!(await isPortAvailable(requiredPort))) {
		throw new Error(`Required ports are not available! required ports:${requiredPort}`);
	}

	return execAsync('lisk-core start --network devnet --api-ipc --log info');
};
