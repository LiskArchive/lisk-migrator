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
import {
	CHAIN_NAME_MAINCHAIN,
	EMPTY_BYTES,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../src/constants';
import {
	GenesisAssetEntry,
	OwnChainDataSubstore,
	RegisteredNamesSubstore,
} from '../../../src/types';

describe('Build assets/interoperability', () => {
	const tokenID = '0400000000000000';
	const chainID = tokenID.slice(0, 8);

	it('should create interoperability module asset', async () => {
		const response: GenesisAssetEntry = await addInteropModuleEntry(tokenID);
		const ownChainDataSubstore = (response.data
			.ownChainDataSubstore as unknown) as OwnChainDataSubstore;
		const registeredNamesSubstore = (response.data
			.registeredNamesSubstore as unknown) as RegisteredNamesSubstore;

		expect(response.module).toEqual(MODULE_NAME_INTEROPERABILITY);
		expect(Object.getOwnPropertyNames(response.data)).toEqual([
			'outboxRootSubstore',
			'chainDataSubstore',
			'channelDataSubstore',
			'chainValidatorsSubstore',
			'ownChainDataSubstore',
			'terminatedStateSubstore',
			'terminatedOutboxSubstore',
			'registeredNamesSubstore',
		]);

		const [ownChainDataSubstoreEntry] = ownChainDataSubstore.filter(
			entry => entry.storeKey === EMPTY_BYTES,
		);
		let chainIDString = ownChainDataSubstoreEntry.storeValue.chainID.toString('hex');
		expect(ownChainDataSubstoreEntry.storeKey).toEqual(EMPTY_BYTES);
		expect(chainIDString).toEqual(chainID);
		expect(ownChainDataSubstoreEntry.storeValue.name).toEqual(CHAIN_NAME_MAINCHAIN);
		expect(ownChainDataSubstoreEntry.storeValue.nonce).toEqual(BigInt('0'));

		const [registeredNamesSubstoreEntry] = registeredNamesSubstore.filter(
			entry => entry.storeKey.toString('utf-8') === CHAIN_NAME_MAINCHAIN,
		);
		const chainNameString = registeredNamesSubstoreEntry.storeKey.toString('utf-8');
		chainIDString = registeredNamesSubstoreEntry.storeValue.chainID.toString('hex');
		expect(chainNameString).toEqual(CHAIN_NAME_MAINCHAIN);
		expect(chainIDString).toEqual(chainID);
	});
});
