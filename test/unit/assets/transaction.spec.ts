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
 */
import { when } from 'jest-when';
import { KVStore } from '@liskhq/lisk-db';
import { Block, Transaction } from '@liskhq/lisk-chain';

import { DB_KEY_TRANSACTIONS_ID, DB_KEY_TRANSACTIONS_BLOCK_ID } from '../../../src/constants';
import { generateBlocks } from '../utils/blocks';
import { getTransactions } from '../../../src/utils/transaction';

jest.mock('@liskhq/lisk-db');

describe('Test Transaction utility', () => {
	let db: any;
	let block: Block;
	let transaction: Transaction;

	beforeAll(async () => {
		db = new KVStore('testDB');
		[block] = generateBlocks({
			startHeight: 1,
			numberOfBlocks: 1,
		});

		transaction = new Transaction({
			moduleID: 2,
			assetID: 0,
			fee: BigInt('10000000'),
			nonce: BigInt('0'),
			senderPublicKey: Buffer.from(
				'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
				'hex',
			),
			signatures: [
				Buffer.from(
					'c49a1b9e8f5da4ddd9c8ad49b6c35af84c233701d53a876ef6e385a46888800334e28430166e2de8cac207452913f0e8b439b03ef8a795748ea23e28b8b1c00c',
					'hex',
				),
			],
			asset: Buffer.alloc(0),
		});
	});

	it('should get transactions', async () => {
		const blockWithPayload = { ...block, payload: transaction };

		when(db.get)
			.calledWith(
				`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${blockWithPayload.header.id.toString('binary')}`,
			)
			.mockResolvedValue(transaction.id as never);

		when(db.get)
			.calledWith(`${DB_KEY_TRANSACTIONS_ID}:${transaction.id.toString('binary')}`)
			.mockResolvedValue(transaction.getBytes() as never);

		const result = await getTransactions(blockWithPayload.header.id, db);

		// Assert
		expect(result).toBeInstanceOf(Array);
		result.forEach(tx => {
			expect(Object.getOwnPropertyNames(tx)).toEqual([
				'moduleID',
				'assetID',
				'nonce',
				'fee',
				'senderPublicKey',
				'asset',
				'signatures',
				'id',
			]);
		});
	});
});
