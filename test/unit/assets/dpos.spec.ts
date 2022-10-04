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
import { MODULE_NAME_DPOS } from '../../../src/constants';
import { AccountEntry } from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import { ADDRESS_LISK32 } from '../utils/regex';

import {
	addDPoSModuleEntry,
	createGenesisDataObj,
	createValidatorsArray,
	createVotersArray,
} from '../../../src/assets/dpos';

describe('Build assets/dpos', () => {
	let accounts: AccountEntry[];

	beforeAll(async () => {
		accounts = [
			createFakeDefaultAccount({
				address: Buffer.from('abd2ed5ad35b3a0870aadae6dceacc988ba63895', 'hex'),
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
				dpos: {
					delegate: {
						username: 'genesis_1',
						lastForgedHeight: 5,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
					},
					sentVotes: [],
					unlocking: [],
				},
			}),
			createFakeDefaultAccount({
				address: Buffer.from('fa526a1611ccc66dec815cb963174118074b736e', 'hex'),
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
				dpos: {
					delegate: {
						username: 'genesis_2',
						lastForgedHeight: 6,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
					},
					sentVotes: [],
					unlocking: [],
				},
			}),
		];
	});

	it('should create createValidatorsArray', async () => {
		const validatorsArray = await createValidatorsArray(accounts, []);

		// Assert
		expect(validatorsArray).toBeInstanceOf(Array);
		validatorsArray.forEach(validator => {
			expect(validator.address).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(validator)).toEqual([
				'address',
				'name',
				'blsKey',
				'proofOfPossession',
				'generatorKey',
				'lastGeneratedHeight',
				'isBanned',
				'pomHeights',
				'consecutiveMissedBlocks',
			]);
		});
	});

	it('should create createVotersArray', async () => {
		const votersArray = await createVotersArray(accounts);

		// Assert
		expect(votersArray).toBeInstanceOf(Array);
		votersArray.forEach(voter => {
			expect(voter.address).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(voter)).toEqual(['address', 'sentVotes', 'pendingUnlocks']);
			voter.sentVotes.forEach(vote =>
				expect(vote.delegateAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
			);
			voter.pendingUnlocks.forEach(unlock =>
				expect(unlock.delegateAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
			);
		});
	});

	it('should create createGenesisDataObj', async () => {
		const genesisDataObj = await createGenesisDataObj();

		// Assert
		genesisDataObj.initDelegates.forEach(address => {
			expect(address).toEqual(expect.stringMatching(ADDRESS_LISK32));
		});
		expect(Object.getOwnPropertyNames(genesisDataObj)).toEqual(['initRounds', 'initDelegates']);
	});

	it('should create DPoS module asset', async () => {
		const dposModuleAsset = await addDPoSModuleEntry(accounts, []);

		// Assert
		expect(dposModuleAsset.module).toEqual(MODULE_NAME_DPOS);
		expect(Object.getOwnPropertyNames(dposModuleAsset.data)).toEqual([
			'validators',
			'voters',
			'snapshots',
			'genesisData',
		]);
	});
});
