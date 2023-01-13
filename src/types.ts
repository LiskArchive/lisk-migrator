/*
 * Copyright © 2020 Lisk Foundation
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
import { Schema } from '@liskhq/lisk-codec';

export interface StorageConfig {
	readonly user: string;
	readonly password: string;
	readonly database: string;
	readonly host: string;
	readonly port: number;
}

export interface Config {
	readonly app: {
		readonly version: string;
		readonly minVersion: string;
		readonly protocolVersion: string;
		readonly genesisConfig: {
			readonly EPOCH_TIME: string;
		};
	};
	readonly components: {
		readonly storage: StorageConfig;
	};
}

export interface UnregisteredAccount {
	address: Buffer;
	balance: bigint;
}

export interface UnregisteredAddresses {
	unregisteredAddresses: UnregisteredAccount[];
}

export interface AuthAccountEntry {
	numberOfSignatures: number;
	mandatoryKeys: string[];
	optionalKeys: string[];
	nonce: string;
}

export interface AuthStoreEntry {
	storeKey: string;
	storeValue: AuthAccountEntry;
}

export interface AuthStoreEntryBuffer extends Omit<AuthStoreEntry, 'storeKey'> {
	storeKey: Buffer;
}

export interface Account {
	address: Buffer;
	token: {
		balance: bigint;
	};
	sequence: {
		nonce: bigint;
	};
	keys: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
		numberOfSignatures: number;
	};
	dpos: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: bigint;
		};
		sentVotes: {
			delegateAddress: Buffer;
			amount: bigint;
		}[];
		unlocking: {
			delegateAddress: Buffer;
			amount: bigint;
			unvoteHeight: number;
		}[];
	};
}

export interface LegacyStoreEntry {
	address: string;
	balance: string;
}

export interface LegacyStoreEntryBuffer extends Omit<LegacyStoreEntry, 'address'> {
	address: Buffer;
}

export interface LegacyStoreData {
	accounts: LegacyStoreEntry[];
}

export interface UserSubstoreEntry {
	address: string;
	tokenID: string;
	availableBalance: string;
	lockedBalances: {
		module: string;
		amount: string;
	}[];
}

export interface UserSubstoreEntryBuffer extends Omit<UserSubstoreEntry, 'address' | 'tokenID'> {
	address: Buffer;
	tokenID: Buffer;
}

export interface SupplySubstoreEntry {
	tokenID: string;
	totalSupply: string;
}

export interface TokenStoreEntry {
	userSubstore: UserSubstoreEntry[];
	supplySubstore: SupplySubstoreEntry[];
	escrowSubstore: [];
	supportedTokensSubstore: [];
}

export interface SharingCoefficients {
	tokenID: string;
	coefficient: string;
}

export interface ValidatorEntry {
	address: string;
	name: string;
	blsKey: string;
	proofOfPossession: string;
	generatorKey: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	commission: number;
	lastCommissionIncreaseHeight: number;
	sharingCoefficients: SharingCoefficients;
}

export interface ValidatorEntryBuffer extends Omit<ValidatorEntry, 'address'> {
	address: Buffer;
}

export interface SentVote {
	delegateAddress: string;
	amount: bigint;
	voteSharingCoefficients: SharingCoefficients[];
}

export interface Voter {
	address: string;
	sentVotes: {
		delegateAddress: string;
		amount: bigint;
	}[];
	pendingUnlocks: {
		delegateAddress: string;
		amount: bigint;
		unvoteHeight: number;
	}[];
}

export interface GenesisDataEntry {
	initRounds: number;
	initDelegates: string[];
}

export interface DPoSStoreEntry {
	validators: ValidatorEntry[];
	voters: Voter[];
	snapshots: Record<string, unknown>;
	genesisData: GenesisDataEntry;
}

export interface LockedBalance {
	module: string;
	amount: string;
}

export interface GenesisAssetEntry {
	module: string;
	data: Record<string, unknown>;
	schema: Schema;
}

export interface DelegateWeight {
	readonly address: Buffer;
	readonly voteWeight: bigint;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export interface GenesisBlockGenerateInput {
	chainID: Buffer;
	height: number;
	timestamp: number;
	previousBlockID: Buffer;
	assets: {
		schema: Schema;
		module: string;
		data: Record<string, unknown>;
	}[];
	getBytes: () => Buffer;
	validateGenesis(): void;
}

export interface VoteWeightsWrapper {
	voteWeights: VoteWeight[];
}

export type Port = number;
