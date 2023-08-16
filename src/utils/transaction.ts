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
import { hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Database } from '@liskhq/lisk-db';
import { Transaction, transactionSchema } from '@liskhq/lisk-chain';

import {
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_TRANSACTIONS_ID,
	TRANSACTION_ID_LENGTH,
} from '../constants';

export const keyString = (key: Buffer): string => key.toString('binary');

export const getTransactions = async (blockID: Buffer, db: Database) => {
	try {
		const txIDs: Buffer[] = [];
		const ids = await db.get(Buffer.from(`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${keyString(blockID)}`));
		for (let idx = 0; idx < ids.length; idx += TRANSACTION_ID_LENGTH) {
			txIDs.push(ids.slice(idx, idx + TRANSACTION_ID_LENGTH));
		}
		if (txIDs.length === 0) {
			return [];
		}
		const transactions = [];
		for (const txID of txIDs) {
			const tx = await db.get(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(txID)}`));
			const decodedTransactions = (await codec.decode(transactionSchema, tx)) as Transaction;

			const id = hash(tx);
			transactions.push({ ...decodedTransactions, id });
		}

		return transactions;
	} catch (error) {
		return [];
	}
};
