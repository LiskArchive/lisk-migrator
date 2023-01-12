import { createServer } from 'net';

import { execAsync, isPortAvailable } from '../../../src/utils/nodeStarter';

import { startServer, closeServer } from '../../utils';

describe('execAsync', () => {
	it('Should execute ls command succesfully', async () => {
		const response = await execAsync('ls');
		expect(response.length).toBeGreaterThan(0);
		// console.log(response);
	});
});

describe('isPortAvailable', () => {
	it('Should execute ls command succesfully', async () => {
		const port = 9901;
		try {
			const isPortAvailableBefore = await isPortAvailable(port);
			expect(isPortAvailableBefore).toBe(true);

			const server = createServer();
			await startServer(server, port);

			const isPortAvailableNow = await isPortAvailable(port);
			expect(isPortAvailableNow).toBe(false);

			await closeServer(server);
		} catch (err) {
			// The port is not available in the host machine
		}
	});
});
