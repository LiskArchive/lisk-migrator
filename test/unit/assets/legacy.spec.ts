/*
 * Copyright © 2022 Lisk Foundation
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
import { KVStore } from '@liskhq/lisk-db';

import { LegacyModuleAsset } from '../../../src/assets/legacy';
import { MODULE_NAME_LEGACY } from '../../../src/constants';

describe('Build assets/legacy', () => {
	let db: any;
	let legacyModuleAsset: any;

	describe('addLegacyModuleEntry', () => {
		beforeAll(async () => {
			const snapshotPath = `${__dirname}/fixtures/blockchain.db`;
			db = new KVStore(snapshotPath);
			legacyModuleAsset = new LegacyModuleAsset(db);
		});

		it('should get legacy accounts', async () => {
			const response = await legacyModuleAsset.addLegacyModuleEntry();

			// Assert
			expect(response.module).toEqual(MODULE_NAME_LEGACY);
			expect(response.data).toHaveProperty('accounts');
			expect(response.data.accounts).toBeInstanceOf(Array);
		});
	});
});
