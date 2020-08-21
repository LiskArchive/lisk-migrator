/*
 * Copyright © 2020 Lisk Foundation
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

import axios from 'axios';

interface ObserveParams {
	readonly height: number;
	readonly address: string;
	readonly port: number;
	readonly delay: number;
}

export const getChainHeight = async (address: string, port: number): Promise<number> => {
	const result = await axios({
		method: 'get',
		url: `http://${address}:${port}/api/node/status`,
	});

	return result.data.data.height;
};

export const observeChainHeight = async (options: ObserveParams): Promise<number> =>
	new Promise((resolve, reject) => {
		let intervalId: NodeJS.Timer;
		let currentHeight: number;

		// eslint-disable-next-line consistent-return
		const checkHeight = async () => {
			let height!: number;
			try {
				height = await getChainHeight(options.address, options.port);
			} catch (error) {
				return reject(error);
			}

			if (height === options.height) {
				clearInterval(intervalId);
				return resolve(height);
			}

			if (height > options.height) {
				return reject(
					new Error(`Network height: ${height} corssed the observed height: ${options.height}`),
				);
			}

			if (currentHeight !== height) {
				// Only show chain height in log when its changed
				currentHeight = height;
				console.info(`\nCurrent height: ${currentHeight}`);
			} else {
				// Show some indicator for user for progress
				process.stdout.write('.');
			}
		};

		intervalId = setInterval(checkHeight, options.delay);
	});
