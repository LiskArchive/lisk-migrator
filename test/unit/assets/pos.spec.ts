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
import { Block } from '@liskhq/lisk-chain';
import { MODULE_NAME_POS } from '../../../src/constants';
import { Account, VoteWeightsWrapper } from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import { generateBlocks } from '../utils/blocks';
import { ADDRESS_LISK32 } from '../utils/regex';

import {
	addPoSModuleEntry,
	createGenesisDataObj,
	createValidatorsArray,
	createStakersArray,
	getStakes,
} from '../../../src/assets/pos';

describe('Build assets/pos', () => {
	const tokenID = '0400000000000000';
	let accounts: Account[];
	let blocks: Block[];
	let delegates: VoteWeightsWrapper;
	const snapshotHeight = 16281107;
	const snapshotHeightPrevious = 16270293;

	beforeAll(async () => {
		blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: 10,
		});
		delegates = {
			voteWeights: [
				{
					round: 103,
					delegates: [
						{
							address: Buffer.from('b8982f66903a6bfa5d6994c08ddf97707200d316', 'hex'),
							voteWeight: BigInt('2130000000000'),
						},
						{
							address: Buffer.from('f1b5b0c9d35957ca463b817467782ffa5d2e6945', 'hex'),
							voteWeight: BigInt('5304000000000'),
						},
					],
				},
			],
		};

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
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [],
					unlocking: [],
				},
				sequence: {
					nonce: BigInt('0'),
				},
				keys: {
					mandatoryKeys: [],
					optionalKeys: [],
					numberOfSignatures: 0,
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
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [
						{
							delegateAddress: Buffer.from('03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f', 'hex'),
							amount: BigInt('1000000000000'),
						},
						{
							delegateAddress: Buffer.from('0903f4c5cb599a7928aef27e314e98291d1e3888', 'hex'),
							amount: BigInt('1000000000000'),
						},
					],
					unlocking: [],
				},
				sequence: {
					nonce: BigInt('0'),
				},
			}),
		];
	});

	it('should create createValidatorsArray', async () => {
		const validatorsArray = await createValidatorsArray(accounts, [], snapshotHeight, tokenID);

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
				'reportMisbehaviorHeights',
				'consecutiveMissedBlocks',
				'lastCommissionIncreaseHeight',
				'commission',
				'sharingCoefficients',
			]);
		});
	});

	it('should create createStakersArray', async () => {
		const stakers = await createStakersArray(accounts, tokenID);

		// Assert
		expect(stakers).toBeInstanceOf(Array);
		stakers.forEach(staker => {
			expect(staker.address).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(staker)).toEqual(['address', 'stakes', 'pendingUnlocks']);
			staker.stakes.forEach(stake =>
				expect(stake.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
			);
			staker.pendingUnlocks.forEach(unlock =>
				expect(unlock.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
			);
		});
	});

	it('should create createGenesisDataObj', async () => {
		const genesisDataObj = await createGenesisDataObj(
			accounts,
			delegates,
			snapshotHeight,
			snapshotHeightPrevious,
		);

		// Assert
		genesisDataObj.initValidators.forEach(address => {
			expect(address).toEqual(expect.stringMatching(ADDRESS_LISK32));
		});
		expect(Object.getOwnPropertyNames(genesisDataObj)).toEqual(['initRounds', 'initValidators']);
	});

	it('should create PoS module asset', async () => {
		const posModuleAsset = await addPoSModuleEntry(
			accounts,
			blocks,
			delegates,
			snapshotHeight,
			snapshotHeightPrevious,
			tokenID,
		);

		// Assert
		expect(posModuleAsset.module).toEqual(MODULE_NAME_POS);
		expect(Object.getOwnPropertyNames(posModuleAsset.data)).toEqual([
			'validators',
			'stakers',
			'genesisData',
		]);
	});

	it('getStakes array', async () => {
		const stakes = await getStakes(accounts[1], tokenID);

		// Assert
		expect(stakes).toBeInstanceOf(Array);
		stakes.forEach(stake => {
			expect(stake.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(stake)).toEqual([
				'amount',
				'sharingCoefficients',
				'validatorAddress',
			]);
			stake.sharingCoefficients.forEach(sharingCoefficient => {
				expect(Object.getOwnPropertyNames(sharingCoefficient)).toEqual(['tokenID', 'coefficient']);
			});
		});
	});
});
