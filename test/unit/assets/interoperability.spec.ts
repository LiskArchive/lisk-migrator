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
import { addInteropModuleEntry } from '../../../src/assets/interoperability';
import { CHAIN_NAME_MAINCHAIN, MODULE_NAME_INTEROPERABILITY } from '../../../src/constants';
import { GenesisAssetEntry } from '../../../src/types';

describe('Build assets/interoperability', () => {
	it('should create interoperability module asset', async () => {
		const response: GenesisAssetEntry = await addInteropModuleEntry();
		expect(response.module).toEqual(MODULE_NAME_INTEROPERABILITY);
		expect(Object.getOwnPropertyNames(response.data)).toEqual([
			'ownChainName',
			'ownChainNonce',
			'chainInfos',
			'terminatedStateAccounts',
			'terminatedOutboxAccounts',
		]);
		expect(response.data.ownChainName).toBe(CHAIN_NAME_MAINCHAIN);
		expect(response.data.ownChainNonce).toBe(0);
	});
});
