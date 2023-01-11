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
import { AuthStoreEntry, AuthAccountEntry, Account, GenesisAssetEntry } from '../types';
import { genesisAuthStoreSchema } from '../schemas';

const keyMapper = (key: Buffer) => key.toString('hex');
const keyComparator = (a: Buffer, b: Buffer) => a.compare(b);

export const addAuthModuleEntry = async (accounts: Account[]): Promise<GenesisAssetEntry> => {
	const authDataSubstorekeys: AuthStoreEntry[] = await Promise.all(
		accounts.map(async (account: Account) => {
			const authObj: AuthAccountEntry = {
				numberOfSignatures: account.keys.numberOfSignatures,
				mandatoryKeys: account.keys.mandatoryKeys.sort(keyComparator).map(keyMapper),
				optionalKeys: account.keys.optionalKeys.sort(keyComparator).map(keyMapper),
				nonce: account.sequence.nonce.toString(),
			};

			return {
				storeKey: getLisk32AddressFromAddress(account.address),
				storeValue: authObj,
			};
		}),
	);

	return {
		module: MODULE_NAME_AUTH,
		data: ({ authDataSubstore: authDataSubstorekeys } as unknown) as Record<string, unknown>,
		schema: genesisAuthStoreSchema,
	};
};
