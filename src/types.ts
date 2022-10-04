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
