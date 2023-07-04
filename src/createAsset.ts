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
import { getLisk32AddressFromAddress } from '@liskhq/lisk-cryptography';

import {
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
	DB_KEY_CHAIN_STATE,
	DB_KEY_ACCOUNTS_ADDRESS,
	BINARY_ADDRESS_LENGTH,
	ADDRESS_LEGACY_RESERVE,
	ALL_SUPPORTED_TOKENS_KEY,
} from './constants';
import { accountSchema, voteWeightsSchema } from './schemas';
import {
	Account,
	VoteWeightsWrapper,
	GenesisAssetEntry,
	UserSubstoreEntry,
	UserSubstoreEntryBuffer,
	SupplySubstoreEntry,
	AuthStoreEntryBuffer,
	ValidatorEntryBuffer,
	StakerBuffer,
	GenesisDataEntry,
	AuthStoreEntry,
	EscrowSubstoreEntry,
	SupportedTokensSubstoreEntry,
} from './types';

import { getInteropModuleEntry } from './assets/interoperability';
import { getAuthModuleEntry, getAuthModuleEntryBuffer } from './assets/auth';
import {
	getTokenModuleEntry,
	createLegacyReserveAccount,
	createUserSubstoreArrayEntry,
	getLockedBalances,
} from './assets/token';
import {
	getPoSModuleEntry,
	createGenesisDataObj,
	createStakersArrayEntry,
	createValidatorsArrayEntry,
	getValidatorKeys,
} from './assets/pos';
import { getLegacyModuleEntry, getLegacyReserveAmount } from './assets/legacy';

import { getDataFromDBStream } from './utils/block';

const AMOUNT_ZERO = BigInt('0');
let totalLSKSupply = AMOUNT_ZERO;

const addressComparator = (
	a: StakerBuffer | ValidatorEntryBuffer,
	b: StakerBuffer | ValidatorEntryBuffer,
) => a.address.compare(b.address);
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
		const authSubstoreEntries: AuthStoreEntryBuffer[] = [];
		const userSubstoreEntries: UserSubstoreEntryBuffer[] = [];
		const supplySubstoreEntries: SupplySubstoreEntry[] = [];
		const escrowSubstore: EscrowSubstoreEntry[] = [];
		const supportedTokensSubstoreEntries: SupportedTokensSubstoreEntry[] = [];
		const validators: ValidatorEntryBuffer[] = [];
		const stakers: StakerBuffer[] = [];

		const encodedUnregisteredAddresses = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`,
		);

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

		// Filter legacy account from the accounts
		const legacyReserveAccount: Account | undefined = accounts.find(account =>
			ADDRESS_LEGACY_RESERVE.equals(account.address),
		);

		// Create legacy module assets
		const legacyModuleAssets = await getLegacyModuleEntry(
			encodedUnregisteredAddresses,
			legacyReserveAccount,
		);

		// Get legacy reserve amount from cache
		const legacyReserveAmount = getLegacyReserveAmount();

		// Create legacy reserve for token module user substore
		const legacyReserve = await createLegacyReserveAccount(
			legacyReserveAccount,
			legacyReserveAmount,
			tokenID,
		);

		// Get all validator keys for PoS module
		const validatorKeys = await getValidatorKeys(
			accounts,
			snapshotHeight,
			snapshotHeightPrevious,
			this._db,
		);

		for (const account of accounts) {
			// genesis asset for auth module
			const authModuleAsset = await getAuthModuleEntryBuffer(account);
			authSubstoreEntries.push(authModuleAsset);

			// genesis asset for token module
			// Create user subtore entries
			const userSubstoreEntry = await createUserSubstoreArrayEntry(account, tokenID);
			if (userSubstoreEntry) userSubstoreEntries.push(userSubstoreEntry);

			// Create total lisk supply for supply subtore
			totalLSKSupply += BigInt(account.token.balance);
			const lockedBalances = await getLockedBalances(account);
			totalLSKSupply = lockedBalances.reduce(
				(accumulator, lockedBalance) => accumulator + BigInt(lockedBalance.amount),
				totalLSKSupply,
			);

			// genesis asset for PoS module
			// Create validator array entries
			const validator = await createValidatorsArrayEntry(
				account,
				validatorKeys,
				snapshotHeight,
				tokenID,
			);
			if (validator) validators.push(validator);

			// Create staker array entries
			const staker = await createStakersArrayEntry(account, tokenID);
			if (staker) stakers.push(staker);
		}

		// Add legacy reserve to user substore array
		userSubstoreEntries.push(legacyReserve);

		// Sort user substore entries in lexicographical order
		const sortedUserSubstore: UserSubstoreEntry[] = userSubstoreEntries
			.sort((a: UserSubstoreEntryBuffer, b: UserSubstoreEntryBuffer) =>
				a.address.equals(b.address) ? a.tokenID.compare(b.tokenID) : a.address.compare(b.address),
			)
			.map(({ address, ...entry }) => ({
				...entry,
				address: getLisk32AddressFromAddress(address),
				tokenID: entry.tokenID.toString('hex'),
			}));

		// Add legacy reserve amount to the total lisk supply
		supplySubstoreEntries.push({
			tokenID,
			totalSupply: String(totalLSKSupply + legacyReserveAmount),
		});

		// Update supported tokens substore to support all tokens by default
		supportedTokensSubstoreEntries.push({
			chainID: ALL_SUPPORTED_TOKENS_KEY,
			supportedTokenIDs: [],
		});

		// Sort validators substore entries in lexicographical order
		const sortedValidators = validators.sort(addressComparator).map(({ address, ...entry }) => ({
			...entry,
			address: getLisk32AddressFromAddress(address),
		}));

		// Sort stakers substore entries in lexicographical order
		const sortedStakers = stakers.sort(addressComparator).map(({ address, ...entry }) => ({
			...entry,
			address: getLisk32AddressFromAddress(address),
		}));

		const encodedDelegatesVoteWeights = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_DELEGATE_VOTE_WEIGHTS}`,
		);

		const decodedDelegatesVoteWeights: VoteWeightsWrapper = await codec.decode(
			voteWeightsSchema,
			encodedDelegatesVoteWeights,
		);

		const genesisData: GenesisDataEntry = await createGenesisDataObj(
			accounts,
			decodedDelegatesVoteWeights,
			snapshotHeight,
		);

		const sortedAuthSubstoreEntries: AuthStoreEntry[] = authSubstoreEntries
			.sort((a, b) => a.storeKey.compare(b.storeKey))
			.map(entry => ({
				...entry,
				storeKey: getLisk32AddressFromAddress(entry.storeKey),
			}));

		// Create auth module assets
		const authModuleAssets = await getAuthModuleEntry(sortedAuthSubstoreEntries);

		// Create token module assets
		const tokenModuleAssets = await getTokenModuleEntry(
			sortedUserSubstore,
			supplySubstoreEntries,
			escrowSubstore,
			supportedTokensSubstoreEntries,
		);

		// Create PoS module assets
		const posModuleAssets = await getPoSModuleEntry(sortedValidators, sortedStakers, genesisData);

		// Create interoperability module assets
		const interoperabilityModuleAssets = await getInteropModuleEntry();

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
