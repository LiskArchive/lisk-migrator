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
import { address } from '@liskhq/lisk-cryptography';

import { MODULE_NAME_AUTH } from '../constants';
import { AuthDataSubstoreEntry, AuthAccountEntry, AccountEntry, ModuleResponse } from '../types';

const delegateComparator = (a: string, b: string) => a.localeCompare(b, 'en');

export const addAuthModuleEntry = async (accounts: AccountEntry[]): Promise<ModuleResponse> => {
	const authDataSubstore: AuthDataSubstoreEntry[] = [];
	await Promise.all(
		accounts.map(async (account: AccountEntry) => {
			const authObj: AuthAccountEntry = {
				numberOfSignatures: account.keys.numberOfSignatures,
				mandatoryKeys: account.keys.mandatoryKeys
					.map((key: Buffer) => key.toString('hex'))
					.sort(delegateComparator),
				optionalKeys: account.keys.optionalKeys
					.map((key: Buffer) => key.toString('hex'))
					.sort(delegateComparator),
				nonce: String(account.sequence.nonce),
			};
			authDataSubstore.push({
				address: address.getLisk32AddressFromAddress(account.address),
				authAccount: authObj,
			});
		}),
	);

	return {
		module: MODULE_NAME_AUTH,
		data: authDataSubstore,
	};
};
