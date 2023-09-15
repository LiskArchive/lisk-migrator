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
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { when } from 'jest-when';

import { getLisk32AddressFromAddress } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Database } from '@liskhq/lisk-db';
import { Block, blockHeaderSchema, blockHeaderAssetSchema } from '@liskhq/lisk-chain';

import { DB_KEY_BLOCKS_HEIGHT, DB_KEY_BLOCKS_ID, MODULE_NAME_POS } from '../../../src/constants';
import {
	Account,
	StakerBuffer,
	ValidatorEntryBuffer,
	VoteWeightsWrapper,
} from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import { generateBlocks } from '../utils/blocks';
import { ADDRESS_LISK32 } from '../utils/regex';

import {
	createGenesisDataObj,
	createValidatorsArrayEntry,
	createStakersArrayEntry,
	getStakes,
	getValidatorKeys,
	getPoSModuleEntry,
	formatInt,
} from '../../../src/assets/pos';

jest.mock('@liskhq/lisk-db');

describe('Build assets/pos', () => {
	let db: any;
	const tokenID = '0400000000000000';
	let accounts: Account[];
	let blocks: Block[];
	let blockIDsStream: { value: Buffer }[];
	let delegates: VoteWeightsWrapper;
	const snapshotHeight = 10815;
	const prevSnapshotBlockHeight = 5000;

	beforeAll(async () => {
		db = new Database('testDB');
		blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: 10,
		});

		blockIDsStream = blocks.map(block => ({ value: block.header.id }));

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

	it('should create createValidatorsArrayEntry', async () => {
		when(db.createReadStream)
			.calledWith({
				gte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(prevSnapshotBlockHeight + 1)}`),
				lte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`),
			})
			.mockReturnValue(Readable.from(blockIDsStream));

		blocks.forEach(block => {
			const blockAssetBuffer = codec.encode(blockHeaderAssetSchema, block.header.asset);
			const blockHeader = codec.encode(blockHeaderSchema, {
				...block.header,
				asset: blockAssetBuffer,
			});
			when(db.get)
				.calledWith(Buffer.from(`${DB_KEY_BLOCKS_ID}:${block.header.id.toString('binary')}`))
				.mockResolvedValue(blockHeader as never);
		});

		const validatorKeys = await getValidatorKeys(
			accounts,
			snapshotHeight,
			prevSnapshotBlockHeight,
			db,
		);

		const validator = (await createValidatorsArrayEntry(
			accounts[0],
			validatorKeys,
			snapshotHeight,
			tokenID,
		)) as ValidatorEntryBuffer;

		// Assert
		expect(validator.address).toBeInstanceOf(Buffer);
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

	it('should create createStakersArrayEntry', async () => {
		const staker = (await createStakersArrayEntry(accounts[1], tokenID)) as StakerBuffer;

		// Assert
		expect(staker.address).toBeInstanceOf(Buffer);
		expect(Object.getOwnPropertyNames(staker)).toEqual(['address', 'stakes', 'pendingUnlocks']);
		staker.stakes.forEach(stake =>
			expect(stake.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
		);
		staker.pendingUnlocks.forEach(unlock =>
			expect(unlock.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
		);
	});

	it('should create createGenesisDataObj', async () => {
		const genesisDataObj = await createGenesisDataObj(accounts, delegates, snapshotHeight);

		// Assert
		genesisDataObj.initValidators.forEach(address => {
			expect(address).toEqual(expect.stringMatching(ADDRESS_LISK32));
		});
		expect(Object.getOwnPropertyNames(genesisDataObj)).toEqual(['initRounds', 'initValidators']);
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

	it('should throw error when creating stream with invalid file path', async () => {
		when(db.createReadStream)
			.calledWith({
				gte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(prevSnapshotBlockHeight + 1)}`),
				lte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`),
			})
			.mockReturnValue(createReadStream('test.txt') as never);

		await expect(
			getValidatorKeys(accounts, snapshotHeight, prevSnapshotBlockHeight, db),
		).rejects.toThrow();
	});

	it('should create PoS module asset', async () => {
		when(db.createReadStream)
			.calledWith({
				gte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(prevSnapshotBlockHeight + 1)}`),
				lte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`),
			})
			.mockReturnValue(Readable.from(blockIDsStream));

		blocks.forEach(block => {
			const blockAssetBuffer = codec.encode(blockHeaderAssetSchema, block.header.asset);
			const blockHeader = codec.encode(blockHeaderSchema, {
				...block.header,
				asset: blockAssetBuffer,
			});
			when(db.get)
				.calledWith(`${DB_KEY_BLOCKS_ID}:${block.header.id.toString('binary')}`)
				.mockResolvedValue(blockHeader as never);
		});

		const validatorKeys = await getValidatorKeys(
			accounts,
			snapshotHeight,
			prevSnapshotBlockHeight,
			db,
		);

		const validator = (await createValidatorsArrayEntry(
			accounts[0],
			validatorKeys,
			snapshotHeight,
			tokenID,
		)) as ValidatorEntryBuffer;

		const staker = (await createStakersArrayEntry(accounts[1], tokenID)) as StakerBuffer;
		const genesisDataObj = await createGenesisDataObj(accounts, delegates, snapshotHeight);

		const posModuleAsset = await getPoSModuleEntry(
			[validator].map(e => ({ ...e, address: getLisk32AddressFromAddress(e.address) })),
			[staker].map(e => ({ ...e, address: getLisk32AddressFromAddress(e.address) })),
			genesisDataObj,
		);

		// Assert
		expect(posModuleAsset.module).toEqual(MODULE_NAME_POS);
		expect(Object.getOwnPropertyNames(posModuleAsset.data)).toEqual([
			'validators',
			'stakers',
			'genesisData',
		]);
	});
});

describe('Test formatInt method', () => {
	it('should return formatted result when called with valid BigInt', async () => {
		const formattedResult = formatInt(BigInt(100));
		await expect(typeof formattedResult).toBe('string');
	});

	it('should throw error when called with negative number', async () => {
		await expect(() => formatInt(-1)).toThrow();
	});

	it('should throw error when called with negative BigInteger', async () => {
		await expect(() => formatInt(BigInt(-1))).toThrow();
	});
});
