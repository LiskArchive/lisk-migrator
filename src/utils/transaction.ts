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
import { codec } from '@liskhq/lisk-codec';
import { Database } from '@liskhq/lisk-db';
import { Transaction, transactionSchema } from '@liskhq/lisk-chain';

import { DB_KEY_TRANSACTIONS_ID } from '../constants';

export const keyString = (key: Buffer): string => key.toString('binary');

export const incrementOne = (input: Buffer): Buffer => {
	const copiedInput = Buffer.alloc(input.length);
	input.copy(copiedInput);
	for (let i = copiedInput.length - 1; i >= 0; i -= 1) {
		const sum = copiedInput[i] + 1;
		// eslint-disable-next-line no-bitwise
		copiedInput[i] = sum & 0xff;

		// Check for carry (overflow) to the next byte
		if (sum <= 0xff) {
			return copiedInput;
		}
	}
	throw new Error('input is already maximum at the size');
};

export const getTransactionPublicKeySet = async (
	db: Database,
	pageSize: number,
): Promise<Set<string>> => {
	const result = new Set<string>();
	let startingKey = Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(Buffer.alloc(32, 0))}`);
	// eslint-disable-next-line no-constant-condition
	while (true) {
		let exist = false;
		const txsStream = db.createReadStream({
			gte: startingKey,
			lte: Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(Buffer.alloc(32, 255))}`),
			limit: pageSize,
		});
		let lastKey = startingKey;
		// eslint-disable-next-line no-loop-func
		await new Promise<void>((resolve, reject) => {
			txsStream
				.on('data', async ({ key, value }) => {
					exist = true;
					const tx = await codec.decode<Transaction>(transactionSchema, value);
					result.add(tx.senderPublicKey.toString('hex'));
					lastKey = key;
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve();
				});
		});
		if (!exist) {
			break;
		}
		startingKey = incrementOne(lastKey as Buffer);
	}
	return result;
};
