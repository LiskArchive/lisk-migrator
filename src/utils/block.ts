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
import { KVStore } from '@liskhq/lisk-db';

import { DB_KEY_BLOCKS_ID } from '../constants';

export const keyString = (key: Buffer): string => key.toString('binary');

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

export const getBlockHeadersByIDs = async (
	db: KVStore,
	blockIDs: ReadonlyArray<Buffer>,
): Promise<Buffer[]> => {
	const blocks = [];
	for (const id of blockIDs) {
		const block = await db.get(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`);
		blocks.push(block);
	}
	return blocks;
};

export const getBlocksIDsFromDBStream = async (stream: NodeJS.ReadableStream) => {
	const blockIDs = await new Promise<Buffer[]>((resolve, reject) => {
		const ids: Buffer[] = [];
		stream
			.on('data', ({ value }: { value: Buffer }) => {
				ids.push(value);
			})
			.on('error', error => {
				reject(error);
			})
			.on('end', () => {
				resolve(ids);
			});
	});
	return blockIDs;
};
