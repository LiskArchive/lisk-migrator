import { Port } from '../src/utils/nodeStarter';

export const startServer = async (server: any, port: Port): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		server.once('error', (err: { code: string }) => {
			reject(new Error(`Could not start server on port: ${port}. \nError:${err.code}`));
		});

		server.once('listening', () => {
			// close the server if listening doesn't fail
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
