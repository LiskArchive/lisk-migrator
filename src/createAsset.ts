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
import { KVStore } from '@liskhq/lisk-db';

import {
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
	DB_KEY_CHAIN_STATE,
	DB_KEY_ACCOUNTS_ADDRESS,
	BINARY_ADDRESS_LENGTH,
} from './constants';
import { accountSchema, voteWeightsSchema } from './schemas';
import { Account, LegacyStoreEntry, VoteWeightsWrapper, GenesisAssetEntry } from './types';

import { addInteropModuleEntry } from './assets/interoperability';
import { addLegacyModuleEntry } from './assets/legacy';
import { addAuthModuleEntry } from './assets/auth';
import { addTokenModuleEntry } from './assets/token';
import { addPoSModuleEntry } from './assets/pos';

import { getDataFromDBStream } from './utils/block';

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

		const allAccounts = ((await getDataFromDBStream(
			accountStream,
			accountSchema,
		)) as unknown) as Account[];

		const accounts: Account[] = allAccounts.filter(
			(acc: Account) => acc.address.length === BINARY_ADDRESS_LENGTH,
		);

		const authModuleAssets = await addAuthModuleEntry(accounts);

		const legacyAccounts: LegacyStoreEntry[] = legacyModuleAssets.data
			.accounts as LegacyStoreEntry[];
		const tokenModuleAssets = await addTokenModuleEntry(accounts, legacyAccounts, tokenID);

		const encodedDelegatesVoteWeights = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_DELEGATE_VOTE_WEIGHTS}`,
		);
		const decodedDelegatesVoteWeights: VoteWeightsWrapper = await codec.decode(
			voteWeightsSchema,
			encodedDelegatesVoteWeights,
		);
		const posModuleAssets = await addPoSModuleEntry(
			accounts,
			decodedDelegatesVoteWeights,
			snapshotHeight,
			snapshotHeightPrevious,
			tokenID,
			this._db,
		);

		const interoperabilityModuleAssets = await addInteropModuleEntry();

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
