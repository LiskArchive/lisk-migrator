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
import { hash } from '@liskhq/lisk-cryptography';
import { codec, Schema } from '@liskhq/lisk-codec';
import { KVStore, formatInt } from '@liskhq/lisk-db';
import { Block } from '@liskhq/lisk-chain';

import {
	DB_KEY_CHAIN_STATE,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_TRANSACTIONS_ID,
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
} from './constants';
import { accountSchema, blockHeaderSchema, transactionSchema, voteWeightsSchema } from './schemas';
import { LegacyStoreEntry, DecodedVoteWeights, GenesisAssetEntry } from './types';

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

export const keyString = (key: Buffer): string => key.toString('binary');

export const getTransactions = async (blockID: Buffer, db: KVStore): Promise<Buffer[]> => {
	const txIDs: Buffer[] = [];
	const ids = await db.get(`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${keyString(blockID)}`);
	const idLength = 32;
	for (let i = 0; i < ids.length; i += idLength) {
		txIDs.push(ids.slice(i, i + idLength));
	}
	if (txIDs.length === 0) {
		return [];
	}
	const transactions = [];
	for (const txID of txIDs) {
		const tx = await db.get(`${DB_KEY_TRANSACTIONS_ID}:${keyString(txID)}`);
		transactions.push(tx);
	}

	return transactions;
};

export class CreateAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public init = async (snapshotHeight: number, tokenID: string): Promise<GenesisAssetEntry[]> => {
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

		const legacyAccounts: LegacyStoreEntry[] = legacyModuleAssets.data
			.accounts as LegacyStoreEntry[];
		const tokenModuleAssets = await addTokenModuleEntry(accounts, legacyAccounts, tokenID);

		const blocksStream = this._db.createReadStream({
			gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(HEIGHT_PREVIOUS_SNAPSHOT_BLOCK + 1)}`,
			lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`,
		});
		// TODO: Discuss/verify the response and decode accordingly
		const blocksHeader = await getDataFromDBStream(blocksStream, blockHeaderSchema);

		const blocks: Block[] = await Promise.all(
			blocksHeader.map(async (blockHeader: string | Buffer) => {
				const blockID = hash(blockHeader);
				const encodedTransactions = await getTransactions(blockID, this._db);
				const decodedTransactions = await encodedTransactions.map(async tx => {
					const transactions = await codec.decode<{
						[key: string]: unknown;
						asset: Buffer;
						moduleID: number;
						assetID: number;
					}>(transactionSchema, tx);

					const id = hash(tx);
					return {
						...transactions,
						id,
					};
				});

				return {
					blockHeader,
					payload: decodedTransactions,
				};
			}),
		);

		const encodedDelegatesVoteWeights = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_DELEGATE_VOTE_WEIGHTS}`,
		);
		const decodedDelegatesVoteWeights: DecodedVoteWeights = await codec.decode(
			voteWeightsSchema,
			encodedDelegatesVoteWeights,
		);
		const dposModuleAssets = await addDPoSModuleEntry(
			accounts,
			blocks,
			decodedDelegatesVoteWeights,
			snapshotHeight,
			tokenID,
		);

		const assets: GenesisAssetEntry[] = [
			legacyModuleAssets,
			authModuleAssets,
			tokenModuleAssets,
			dposModuleAssets,
		].sort((a, b) => a.module.localeCompare(b.module, 'en'));

		return assets;
	};
}
