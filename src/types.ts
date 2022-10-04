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
	readonly address: Buffer;
	readonly balance: bigint;
}

export interface UnregisteredAddresses {
	readonly unregisteredAddresses: UnregisteredAccount[];
}

export interface AuthAccount {
	numberOfSignatures?: number;
	mandatoryKeys?: any;
	optionalKeys?: any;
	nonce?: string;
}

export interface AuthDataSubstore {
	address: string;
	authAccount: AuthAccount;
}

export interface Account {
	readonly address: Buffer;
	readonly token: {
		readonly balance: bigint;
	};
	readonly sequence: {
		readonly nonce: bigint;
	};
	readonly keys: {
		readonly mandatoryKeys: Buffer[];
		readonly optionalKeys: Buffer[];
		readonly numberOfSignatures: number;
	};
	readonly dpos: {
		readonly delegate: {
			readonly username: string;
			readonly pomHeights: number[];
			readonly consecutiveMissedBlocks: number;
			readonly lastForgedHeight: number;
			readonly isBanned: boolean;
			readonly totalVotesReceived: bigint;
		};
		readonly sentVotes: {
			readonly delegateAddress: Buffer;
			readonly amount: bigint;
		}[];
		readonly unlocking: {
			readonly delegateAddress: Buffer;
			readonly amount: bigint;
			readonly unvoteHeight: number;
		}[];
	};
}

export interface LegacyAccount {
	address: string;
	balance: string;
}

export interface Block<T = Buffer | string> {
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

export interface UserSubstore {
	address: string;
	tokenID: string;
	availableBalance: string;
	lockedBalances: {
		module: string;
		amount: string;
	}[];
}

export interface SupplySubstore {
	localID: string;
	totalSupply: string;
}

export interface TokenStore {
	userSubstore: UserSubstore[];
	supplySubstore: SupplySubstore[];
	escrowSubstore: Record<string, unknown>;
	availableLocalIDSubstore: {
		nextAvailableLocalID: string;
	};
}

export interface Validator {
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

export interface Voter {
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

export interface GenesisData {
	initRounds: number;
	initDelegates: string[];
}

export interface DPoSStore {
	validators: Validator[];
	voters: Voter[];
	snapshots: Record<string, unknown>;
	genesisData: GenesisData;
}
