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
import { codec, Schema } from '@liskhq/lisk-codec';
import { KVStore, formatInt } from '@liskhq/lisk-db';

import {
	DB_KEY_CHAIN_STATE,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_BLOCKS_HEIGHT,
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
} from './constants';
import { accountSchema, blockHeaderSchema } from './schemas';
import { LegacyStoreData } from './types';

import { addLegacyModuleEntry } from './assets/legacy';
import { addAuthModuleEntry } from './assets/auth';
import { addTokenModuleEntry } from './assets/token';
import { addDPoSModuleEntry } from './assets/dpos';

export const getDataFromDBStream = async (stream: NodeJS.ReadableStream, schema: Schema) => {
	const data = await new Promise<any>((resolve, reject) => {
		const result: any[] = [];
		stream
			.on('data', async ({ value }) => {
				const decodedResult = await codec.decode(schema, value);
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

export class CreateAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public init = async (snapshotHeight: number): Promise<Record<string, unknown>> => {
		const encodedUnregisteredAddresses = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`,
		);

		const legacyModuleAssets = await addLegacyModuleEntry(encodedUnregisteredAddresses);

		const accountStream = await this._db.createReadStream({
			gte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 0).toString('binary')}`,
			lte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 255).toString('binary')}`,
		});

		const accounts = await getDataFromDBStream(accountStream, accountSchema);

		const authModuleAssets = await addAuthModuleEntry(accounts);

		const legacyAccounts: LegacyStoreData[] = legacyModuleAssets.data.accounts;
		const tokenModuleAssets = await addTokenModuleEntry(accounts, legacyAccounts);

		const blocksStream = this._db.createReadStream({
			gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(HEIGHT_PREVIOUS_SNAPSHOT_BLOCK + 1)}`,
			lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`,
		});
		// TODO: Discuss/verify the response and decode accordingly
		const blocks = await getDataFromDBStream(blocksStream, blockHeaderSchema);

		const dposModuleAssets = await addDPoSModuleEntry(accounts, blocks);

		// Either return or create assets.json file
		return {
			legacyModuleAssets,
			authModuleAssets,
			tokenModuleAssets,
			dposModuleAssets,
		};
	};
}
