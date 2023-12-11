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
import {
	Account,
	AuthAccountEntry,
	AuthStoreEntry,
	AuthStoreEntryBuffer,
	GenesisAssetEntry,
} from '../types';
import { MODULE_NAME_AUTH } from '../constants';
import { genesisAuthStoreSchema } from '../schemas';

const keyMapper = (key: Buffer) => key.toString('hex');
const keyComparator = (a: Buffer, b: Buffer) => a.compare(b);

export const getAuthModuleEntryBuffer = async (account: Account): Promise<AuthStoreEntryBuffer> => {
	const authObj: AuthAccountEntry = {
		numberOfSignatures: account.keys.numberOfSignatures,
		mandatoryKeys: account.keys.mandatoryKeys.sort(keyComparator).map(keyMapper),
		optionalKeys: account.keys.optionalKeys.sort(keyComparator).map(keyMapper),
		nonce: String(account.sequence.nonce),
	};

	return {
		address: account.address,
		authAccount: authObj,
	};
};

export const getAuthModuleEntry = async (
	authStoreEntries: AuthStoreEntry[],
): Promise<GenesisAssetEntry> => ({
	module: MODULE_NAME_AUTH,
	data: ({ authDataSubstore: authStoreEntries } as unknown) as Record<string, unknown>,
	schema: genesisAuthStoreSchema,
});
