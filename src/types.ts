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
	mandatoryKeys: any;
	optionalKeys: any;
	nonce: string;
}

export interface AuthDataSubstoreEntry {
	address: string;
	authAccount: AuthAccountEntry;
}

export interface AccountEntry {
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

export interface LegacyAccountEntry {
	address: string;
	balance: string;
}

export interface BlockEntry<T = Buffer | string> {
	header: {
		[key: string]: unknown;
		id?: T;
		generatorPublicKey: Buffer;
		version: number;
		transactions: Record<string, unknown>;
		asset: Record<string, unknown>;
	};
	payload: {
		[key: string]: unknown;
		id?: T;
		senderPublicKey: Buffer;
	}[];
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

export interface SupplySubstoreEntry {
	localID: string;
	totalSupply: string;
}

export interface TokenStoreEntry {
	userSubstore: UserSubstoreEntry[];
	supplySubstore: SupplySubstoreEntry[];
	escrowSubstore: [];
	availableLocalIDSubstore: {
		nextAvailableLocalID: string;
	};
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
}

export interface VoterEntry {
	address: string;
	sentVotes: {
		delegateAddress: string;
		amount: string;
	}[];
	pendingUnlocks: {
		delegateAddress: string;
		amount: string;
		unvoteHeight: number;
	}[];
}

export interface GenesisDataEntry {
	initRounds: number;
	initDelegates: string[];
}

export interface DPoSStoreEntry {
	validators: ValidatorEntry[];
	voters: VoterEntry[];
	snapshots: Record<string, unknown>;
	genesisData: GenesisDataEntry;
}
