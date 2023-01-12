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
import { Port } from '../src/utils/nodeStarter';

export const startServer = async (server: any, port: Port): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		server.once('error', (err: { code: string }) => {
			reject(new Error(`Could not start server on port: ${port}. \nError:${err.code}`));
		});

		server.once('listening', () => {
			// Close the server if listening doesn't fail
			resolve(true);
		});

		server.listen(port);
	});

export const closeServer = async (server: any): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		server.close((err?: Error) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
