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
import { createServer } from 'net';

import { isPortAvailable } from '../../../src/utils/network';

import { startServer, closeServer } from '../../utils/server';

import { Port } from '../../../src/types';

describe('isPortAvailable', () => {
	it('Should return port availablity properly', async () => {
		// Keep trying until a free port is found for testing
		while (true) {
			const port: Port = Math.round(Math.random() * 65536);
			try {
				const isPortAvailableBefore = await isPortAvailable(port);
				expect(isPortAvailableBefore).toBe(true);

				const server = createServer();
				await startServer(server, port);

				const isPortAvailableNow = await isPortAvailable(port);
				expect(isPortAvailableNow).toBe(false);

				await closeServer(server);
				break;
			} catch (err) {
				// The port is not available on the host machine
			}
		}
	});
});
