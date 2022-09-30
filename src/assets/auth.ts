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
import { MODULE_NAME_AUTH } from '../constants';
import { AuthDataSubstore, AuthAccount, Account } from '../types';

const delegateComparator = (a: string, b: string) => a.localeCompare(b, 'en');

export const addAuthModuleEntry = async (accounts: Account[]) => {
	const authDataSubstore: AuthDataSubstore[] = [];
	await Promise.all(
		accounts.map(async (account: Account) => {
			const authObj: AuthAccount = {};
			authObj.numberOfSignatures = account.keys.numberOfSignatures;
			authObj.mandatoryKeys = account.keys.mandatoryKeys
				.map((key: Buffer) => key.toString('hex'))
				.sort(delegateComparator);
			authObj.optionalKeys = account.keys.optionalKeys
				.map((key: Buffer) => key.toString('hex'))
				.sort(delegateComparator);

			authObj.nonce = String(account.sequence.nonce);
			authDataSubstore.push({
				address: account.address.toString('hex'),
				authAccount: authObj,
			});
		}),
	);

	return {
		moduie: MODULE_NAME_AUTH,
		data: authDataSubstore,
	};
};
