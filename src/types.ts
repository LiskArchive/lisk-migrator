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

export interface UserStoreEntry {
	address: string;
	tokenID: string;
	availableBalance: string;
	lockedBalances: {
		module: string;
		amount: string;
	}[];
}

export interface SupplyStoreEntry {
	tokenID: string;
	totalSupply: string;
}

export interface TokenStoreEntry {
	userSubstore: UserStoreEntry[];
	supplySubstore: SupplyStoreEntry[];
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
	schema: any;
}

export interface DelegateWeight {
	readonly address: Buffer;
	readonly voteWeight: bigint;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export type VoteWeights = VoteWeight[];

export interface DecodedVoteWeights {
	voteWeights: VoteWeights;
}

export interface GenesisBlockGenerateInput {
	chainID: Buffer;
	height?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
	assets: {
		schema: Schema;
		module: string;
		data: Record<string, unknown>;
	}[];
	getBytes: () => Buffer;
	validateGenesis(): void;
}

export interface RegisteredModule {
	id: number;
	name: string;
	actions: string[];
	events: string[];
	reducers: string[];
	transactionAssets: {
		id: number;
		name: string;
	}[];
}

export interface GenesisConfig {
	[key: string]: unknown;
	readonly bftThreshold: number;
	readonly communityIdentifier: string;
	readonly blockTime: number;
	readonly maxPayloadLength: number;
	readonly rewards: {
		readonly milestones: string[];
		readonly offset: number;
		readonly distance: number;
	};
	readonly minFeePerByte: number;
	readonly baseFees: {
		readonly moduleID: number;
		readonly assetID: number;
		readonly baseFee: string;
	}[];
}
export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly networkIdentifier: string;
	readonly lastBlockID: string;
	readonly genesisHeight: number;
	readonly height: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesisConfig: GenesisConfig;
	readonly registeredModules: RegisteredModule[];
}
