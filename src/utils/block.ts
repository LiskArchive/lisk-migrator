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
import { codec, Schema } from '@liskhq/lisk-codec';
import { Database } from '@liskhq/lisk-db';
import { BlockHeader } from '@liskhq/lisk-chain';

import { DB_KEY_BLOCKS_ID } from '../constants';
import { blockHeaderSchema } from '../schemas';
import { keyString, incrementOne } from './transaction';

export const getDataFromDBStream = async (stream: NodeJS.ReadableStream, schema: Schema) => {
	const data = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
		const result: Record<string, unknown>[] = [];
		stream
			.on('data', async ({ value }) => {
				const decodedResult: Record<string, unknown> = await codec.decode(schema, value);
				result.push(decodedResult);
			})
			.on('error', error => {
				reject(error);
			})
			.on('end', () => {
				resolve(result);
			});
	});
	return data;
};

export const getBlockPublicKeySet = async (
	db: Database,
	pageSize: number,
): Promise<Set<string>> => {
	const result = new Set<string>();
	let startingKey = Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(Buffer.alloc(32, 0))}`);
	// eslint-disable-next-line no-constant-condition
	while (true) {
		let exist = false;
		const blocksStream = db.createReadStream({
			gte: startingKey,
			lte: Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(Buffer.alloc(32, 255))}`),
			limit: pageSize,
		});
		let lastKey = startingKey;
		// eslint-disable-next-line no-loop-func
		await new Promise<void>((resolve, reject) => {
			blocksStream
				.on('data', async ({ key, value }) => {
					exist = true;
					const header = await codec.decode<BlockHeader>(blockHeaderSchema, value);
					result.add(header.generatorPublicKey.toString('hex'));
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
