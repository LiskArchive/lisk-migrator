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
import { addAuthModuleEntry } from '../../../src/assets/auth';
import { MODULE_NAME_AUTH } from '../../../src/constants';
import { Account, AuthAccountEntry, AuthStoreEntry, GenesisAssetEntry } from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import { ADDRESS_LISK32 } from '../utils/regex';

describe('Build assets/auth', () => {
	let accounts: Account[];
	beforeAll(async () => {
		accounts = [
			createFakeDefaultAccount({
				address: Buffer.from('cc96c0a5db38b968f563e7af6fb435585c889111', 'hex'),
				token: {
					balance: BigInt('0'),
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
					numberOfSignatures: 3,
				},
				token: {
					balance: BigInt('0'),
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

	it('should get auth accounts', async () => {
		const response: GenesisAssetEntry = await addAuthModuleEntry(accounts);
		const data = (response.data as unknown) as AuthStoreEntry[];

		expect(response.module).toEqual(MODULE_NAME_AUTH);
		expect(response.data).toHaveLength(2);
		expect(Object.getOwnPropertyNames(response.data[0])).toEqual(['storeKey', 'storeValue']);
		data.forEach((asset: { storeKey: string; storeValue: AuthAccountEntry }) => {
			expect(asset.storeKey).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(asset.storeValue)).toEqual([
				'numberOfSignatures',
				'mandatoryKeys',
				'optionalKeys',
				'nonce',
			]);
		});
	});
});
