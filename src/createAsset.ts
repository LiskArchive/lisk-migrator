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
import { codec } from '@liskhq/lisk-codec';
import { KVStore, formatInt } from '@liskhq/lisk-db';

import {
	DB_KEY_CHAIN_STATE,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_BLOCKS_HEIGHT,
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
	HEIGHT_SNAPSHOT,
} from './constants';

import { accountSchema, blockHeaderSchema } from './schemas';

import { addLegacyModuleEntry } from './assets/legacy';
import { addAuthModuleEntry } from './assets/auth';
import { addTokenModuleEntry } from './assets/token';
import { addDPoSModuleEntry } from './assets/dpos';

export class CreateAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public init = async (): Promise<Record<string, unknown>> => {
		// Create legacy module asset
		const encodedUnregisteredAddresses = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`,
		);

		const legacyModuleAssets = await addLegacyModuleEntry(encodedUnregisteredAddresses);

		// Create other module assets
		const accountStream = await this._db.createReadStream({
			gte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 0).toString('binary')}`,
			lte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 255).toString('binary')}`,
		});

		const allAccounts = await new Promise<any>((resolve, reject) => {
			const accounts: Buffer[] = [];
			accountStream
				.on('data', async ({ value }) => {
					accounts.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(accounts);
				});
		});

		const accounts: any = await Promise.all(
			allAccounts.map(async (account: Buffer) => codec.decode(accountSchema, account)),
		);

		const authModuleAssets = await addAuthModuleEntry(accounts);

		const legacyAccounts: any = legacyModuleAssets.data.accounts;
		const tokenModuleAssets = await addTokenModuleEntry(accounts, legacyAccounts);

		const blockStream = this._db.createReadStream({
			gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(HEIGHT_PREVIOUS_SNAPSHOT_BLOCK + 1)}`,
			lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(HEIGHT_SNAPSHOT)}`,
		});

		const allBlocks = await new Promise<any>((resolve, reject) => {
			const blocks: Buffer[] = [];
			blockStream
				.on('data', async ({ value }) => {
					blocks.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(blocks);
				});
		});

		const blocks: any = await Promise.all(
			allBlocks.map(async (block: Buffer) => codec.decode(blockHeaderSchema, block)),
		);
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
