/*
 * Copyright © 2023 Lisk Foundation
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
 *
 */
import { when } from 'jest-when';

import { Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { blockHeaderAssetSchema, blockHeaderSchema } from '@liskhq/lisk-chain';

import { generateBlocks } from './blocks';
import { formatInt, getBlockHeaderByHeight } from '../../../src/utils/block';
import { DB_KEY_BLOCKS_HEIGHT, DB_KEY_BLOCKS_ID } from '../../../src/constants';
import { keyString } from '../../../src/utils/transaction';

jest.mock('@liskhq/lisk-db');

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

describe('Test getBlockHeaderByHeight method', () => {
	let db: any;
	let blockHeader: Buffer;
	let blockID: Buffer;

	beforeAll(async () => {
		db = new Database('testDB');
		const [block] = generateBlocks({
			startHeight: 150,
			numberOfBlocks: 1,
		});

		const blockAssetBuffer = codec.encode(blockHeaderAssetSchema, block.header.asset);
		blockHeader = codec.encode(blockHeaderSchema, {
			...block.header,
			asset: blockAssetBuffer,
		});
		blockID = block.header.id;
	});

	it('should return block header when called with valid height', async () => {
		const blockHeight = 150;

		when(db.get)
			.calledWith(Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(blockHeight)}`))
			.mockResolvedValue(blockID as never);

		when(db.get)
			.calledWith(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(blockID)}`))
			.mockResolvedValue(blockHeader as never);

		const block = await getBlockHeaderByHeight(db, blockHeight);
		expect(Object.getOwnPropertyNames(block)).toEqual([
			'version',
			'timestamp',
			'height',
			'previousBlockID',
			'transactionRoot',
			'generatorPublicKey',
			'reward',
			'asset',
			'signature',
			'id',
		]);
	});
});
