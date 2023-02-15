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
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
	DB_KEY_CHAIN_STATE,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_TRANSACTIONS_ID,
	DB_KEY_BLOCKS_ID,
} from './constants';
import { accountSchema, transactionSchema, voteWeightsSchema, blockHeaderSchema } from './schemas';
import { LegacyStoreEntry, VoteWeightsWrapper, GenesisAssetEntry } from './types';

import { addInteropModuleEntry } from './assets/interoperability';
import { addLegacyModuleEntry } from './assets/legacy';
import { addAuthModuleEntry } from './assets/auth';
import { addTokenModuleEntry } from './assets/token';
import { addPoSModuleEntry } from './assets/pos';

export const keyString = (key: Buffer): string => key.toString('binary');

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

export const getBlockHeadersByIDs = async (
	db: KVStore,
	arrayOfBlockIds: ReadonlyArray<Buffer>,
): Promise<Buffer[]> => {
	const blocks = [];
	for (const id of arrayOfBlockIds) {
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

export const getTransactions = async (blockID: Buffer, db: KVStore): Promise<Buffer[]> => {
	try {
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
	} catch (error) {
		return [];
	}
};

export class CreateAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public init = async (
		snapshotHeight: number,
		snapshotHeightPrevious: number,
		tokenID: string,
	): Promise<GenesisAssetEntry[]> => {
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
			gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeightPrevious + 1)}`,
			lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`,
		});

		const arrayOfBlockIds = await getBlocksIDsFromDBStream(blocksStream);
		const blocksHeader = await getBlockHeadersByIDs(this._db, arrayOfBlockIds);

		const blocks = ((await Promise.all(
			blocksHeader.map(async (blockHeader: Buffer) => {
				const blockID = hash(blockHeader);
				const decodedBlockHeader = codec.decode(blockHeaderSchema, blockHeader);
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
					header: decodedBlockHeader,
					payload: decodedTransactions,
				};
			}),
		)) as unknown) as Block[];

		const encodedDelegatesVoteWeights = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_DELEGATE_VOTE_WEIGHTS}`,
		);
		const decodedDelegatesVoteWeights: VoteWeightsWrapper = await codec.decode(
			voteWeightsSchema,
			encodedDelegatesVoteWeights,
		);
		const posModuleAssets = await addPoSModuleEntry(
			accounts,
			blocks,
			decodedDelegatesVoteWeights,
			snapshotHeight,
			snapshotHeightPrevious,
			tokenID,
		);

		const interoperabilityModuleAssets = await addInteropModuleEntry(tokenID);

		const assets: GenesisAssetEntry[] = [
			legacyModuleAssets,
			authModuleAssets,
			tokenModuleAssets,
			posModuleAssets,
			interoperabilityModuleAssets,
		].sort((a, b) => a.module.localeCompare(b.module, 'en'));

		return assets;
	};
}
