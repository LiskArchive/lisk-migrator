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
import { when } from 'jest-when';

import { hash, getKeys, getFirstEightBytesReversed } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';

import { LegacyModuleAsset } from '../../../src/assets/legacy';
import {
	DB_KEY_CHAIN_STATE,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	MODULE_NAME_LEGACY,
} from '../../../src/constants';

import { unregisteredAddressesSchema } from '../../../src/schemas';
import { UnregisteredAccount } from '../../../src/types';

jest.mock('@liskhq/lisk-db');

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = getKeys(passphrase);
	return getFirstEightBytesReversed(hash(publicKey));
};

describe('Build assets/legacy', () => {
	let db: any;
	let legacyModuleAsset: any;
	let unregisteredAddresses: UnregisteredAccount[];
	let encodedUnregisteredAddresses: Buffer;

	interface Accounts {
		[key: string]: {
			passphrase: string;
		};
	}

	const testAccounts: Accounts = {
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

	describe('addLegacyModuleEntry', () => {
		beforeEach(async () => {
			db = new KVStore('testDB');
			legacyModuleAsset = new LegacyModuleAsset(db);

			for (const account of Object.values(testAccounts)) {
				unregisteredAddresses = [];
				unregisteredAddresses.push({
					address: getLegacyBytesFromPassphrase(account.passphrase),
					balance: BigInt(Math.floor(Math.random() * 1000)),
				});
			}

			encodedUnregisteredAddresses = await codec.encode(unregisteredAddressesSchema, {
				unregisteredAddresses,
			});
		});

		it('should get legacy accounts', async () => {
			when(db.get)
				.calledWith(`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`)
				.mockResolvedValue(encodedUnregisteredAddresses as never);

			const response = await legacyModuleAsset.addLegacyModuleEntry();

			// Assert
			expect(db.get).toHaveBeenCalledTimes(1);
			expect(response.module).toEqual(MODULE_NAME_LEGACY);
			expect(response.data.accounts).toEqual(unregisteredAddresses);
		});

		it('should throw error when no legacy accounts exists', async () => {
			when(db.get)
				.calledWith(`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`)
				.mockRejectedValue(new NotFoundError('Data not found') as never);

			// Assert
			await expect(legacyModuleAsset.addLegacyModuleEntry()).rejects.toBeInstanceOf(NotFoundError);
		});
	});
});
