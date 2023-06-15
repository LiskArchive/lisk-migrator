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
import { hash, getKeys, getFirstEightBytesReversed } from '@liskhq/lisk-cryptography';

import { Account, LegacyStoreEntry, UserSubstoreEntryBuffer } from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';

import { createUserSubstoreArray, createLegacyReserveAccount } from '../../../src/assets/token';

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = getKeys(passphrase);
	return getFirstEightBytesReversed(hash(publicKey));
};

describe('Build assets/token', () => {
	const tokenID = '0400000000000000';
	const AMOUNT_ZERO = BigInt('0');
	let legacyAccount: LegacyStoreEntry[];
	let accounts: Account[];
	let legacyAccountBalance: bigint = AMOUNT_ZERO;

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
		legacyAccountBalance = BigInt(Math.floor(Math.random() * 1000));
		for (const account of Object.values(testAccounts)) {
			legacyAccount = [];
			legacyAccount.push({
				address: getLegacyBytesFromPassphrase(account.passphrase).toString('hex'),
				balance: String(legacyAccountBalance),
			});
		}

		accounts = [
			createFakeDefaultAccount({
				address: Buffer.from('cc96c0a5db38b968f563e7af6fb435585c889111', 'hex'),
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
				sequence: {
					nonce: BigInt('0'),
				},
				keys: {
					mandatoryKeys: [],
					optionalKeys: [],
					numberOfSignatures: 0,
				},
				dpos: {
					delegate: {
						username: '',
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						lastForgedHeight: 0,
						isBanned: false,
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [],
					unlocking: [],
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
				sequence: {
					nonce: BigInt('0'),
				},
				dpos: {
					delegate: {
						username: '',
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						lastForgedHeight: 0,
						isBanned: false,
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [],
					unlocking: [],
				},
			}),
		];
	});

	it('should create userSubstore', async () => {
		const userSubstore = (await createUserSubstoreArray(
			accounts[0],
			tokenID,
		)) as UserSubstoreEntryBuffer;

		// Assert
		expect(userSubstore.address).toBeInstanceOf(Buffer);
		expect(Object.getOwnPropertyNames(userSubstore)).toEqual([
			'address',
			'tokenID',
			'availableBalance',
			'lockedBalances',
		]);
	});

	it('should create legacyReserveAccount', async () => {
		const legacyReserveAmount = BigInt('0');
		const legacyReserveAccount = await createLegacyReserveAccount(
			accounts[0],
			legacyReserveAmount,
			tokenID,
		);

		// Assert
		expect(Object.getOwnPropertyNames(legacyReserveAccount)).toEqual([
			'address',
			'tokenID',
			'availableBalance',
			'lockedBalances',
		]);
	});
});
