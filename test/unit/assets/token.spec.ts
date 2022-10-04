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
import { utils, legacy, legacyAddress } from '@liskhq/lisk-cryptography';

import { MODULE_NAME_TOKEN } from '../../../src/constants';
import { AccountEntry, LegacyAccountEntry } from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import {
	addTokenModuleEntry,
	createUserSubstoreArray,
	createSupplySubstoreArray,
	createLegacyReserveAccount,
} from '../../../src/assets/token';

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = legacy.getKeys(passphrase);
	return legacyAddress.getFirstEightBytesReversed(utils.hash(publicKey));
};

describe('Build assets/token', () => {
	let legacyAccount: LegacyAccountEntry[];
	let accounts: AccountEntry[];

	interface legacyAccounts {
		[key: string]: {
			passphrase: string;
		};
	}

	const testAccounts: legacyAccounts = {
		account1: {
			passphrase: 'float slow tiny rubber seat lion arrow skirt reveal garlic draft shield',
		},
		account2: {
			passphrase: 'hand nominee keen alarm skate latin seek fox spring guilt loop snake',
		},
		account3: {
			passphrase: 'february large secret save risk album opera rebel tray roast air captain',
		},
	};

	beforeAll(async () => {
		for (const account of Object.values(testAccounts)) {
			legacyAccount = [];
			legacyAccount.push({
				address: getLegacyBytesFromPassphrase(account.passphrase).toString('hex'),
				balance: String(Math.floor(Math.random() * 1000)),
			});
		}

		accounts = [
			createFakeDefaultAccount({
				address: Buffer.from('cc96c0a5db38b968f563e7af6fb435585c889111', 'hex'),
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
			}),
			createFakeDefaultAccount({
				address: Buffer.from('584dd8a902822a9469fb2911fcc14ed5fd98220d', 'hex'),
				keys: {
					mandatoryKeys: [
						Buffer.from('456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e', 'hex'),
					],
					optionalKeys: [],
					numberOfSignatures: 2,
				},
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
			}),
		];
	});

	it('should create userSubstore', async () => {
		const userSubstore = await createUserSubstoreArray(accounts, legacyAccount);

		// Assert
		expect(userSubstore).toBeInstanceOf(Array);
		expect(Object.keys(userSubstore[0])).toEqual([
			'address',
			'tokenID',
			'availableBalance',
			'lockedBalances',
		]);
	});

	it('should create supplySubStore', async () => {
		const supplySubStore = await createSupplySubstoreArray(accounts);

		// Assert
		expect(supplySubStore).toBeInstanceOf(Array);
		expect(Object.keys(supplySubStore[0])).toEqual(['localID', 'totalSupply']);
	});

	it('should create legacyReserveAccount', async () => {
		const legacyReserveAccount = await createLegacyReserveAccount(accounts, legacyAccount);

		// Assert
		expect(Object.keys(legacyReserveAccount)).toEqual([
			'address',
			'tokenID',
			'availableBalance',
			'lockedBalances',
		]);
	});

	it('should create token module asset', async () => {
		const response = await addTokenModuleEntry(accounts, legacyAccount);

		// Assert
		expect(response.module).toEqual(MODULE_NAME_TOKEN);
		expect(Object.keys(response.data)).toEqual([
			'userSubstore',
			'supplySubstore',
			'escrowSubstore',
			'availableLocalIDSubstore',
		]);
	});
});
