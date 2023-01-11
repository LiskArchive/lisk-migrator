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
import { getLisk32AddressFromAddress } from '@liskhq/lisk-cryptography';

import { MODULE_NAME_AUTH } from '../constants';
import { genesisAuthStoreSchema } from '../schemas';
import {
	AuthStoreEntry,
	AuthAccountEntry,
	Account,
	GenesisAssetEntry,
	AuthStoreEntryBuffer,
} from '../types';

const keyMapper = (key: Buffer) => key.toString('hex');
const keyComparator = (a: Buffer, b: Buffer) => a.compare(b);

export const addAuthModuleEntry = async (accounts: Account[]): Promise<GenesisAssetEntry> => {
	const authDataSubstoreKeys: AuthStoreEntryBuffer[] = await Promise.all(
		accounts.map(async (account: Account) => {
			const authObj: AuthAccountEntry = {
				numberOfSignatures: account.keys.numberOfSignatures,
				mandatoryKeys: account.keys.mandatoryKeys.sort(keyComparator).map(keyMapper),
				optionalKeys: account.keys.optionalKeys.sort(keyComparator).map(keyMapper),
				nonce: account.sequence.nonce.toString(),
			};

			return {
				storeKey: account.address,
				storeValue: authObj,
			};
		}),
	);

	const sortedAuthDataSubstore: AuthStoreEntry[] = authDataSubstoreKeys
		.sort((a, b) => a.storeKey.compare(b.storeKey))
		.map(entry => ({
			...entry,
			storeKey: getLisk32AddressFromAddress(entry.storeKey),
		}));

	return {
		module: MODULE_NAME_AUTH,
		data: ({ authDataSubstore: sortedAuthDataSubstore } as unknown) as Record<string, unknown>,
		schema: genesisAuthStoreSchema,
	};
};
