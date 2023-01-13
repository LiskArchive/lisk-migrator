import { createServer } from 'net';

import { Port } from '../types';

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
