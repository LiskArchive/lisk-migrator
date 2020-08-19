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

export interface StorageConfig {
	readonly user: string;
	readonly password: string;
	readonly database: string;
	readonly host: string;
	readonly port: number;
}

export interface HTTApiConfig {
	readonly address: string;
	readonly httpPort: number;
}

export interface Config {
	readonly components: {
		readonly storage: StorageConfig;
	};
	readonly modules: {
		// eslint-disable-next-line camelcase
		readonly http_api: HTTApiConfig;
	};
}
