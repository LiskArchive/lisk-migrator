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

export interface Transaction {
	readonly module: string;
	readonly command: string;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly params: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly id: Buffer;
}

export interface BlockHeader {
	readonly version: number;
	readonly height: number;
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly maxHeightPrevoted: number;
	readonly maxHeightGenerated: number;
	readonly aggregateCommit: {
		readonly height: number;
		readonly aggregationBits: Buffer;
		readonly certificateSignature: Buffer;
	};
	readonly validatorsHash: Buffer;
	readonly stateRoot: Buffer;
	readonly transactionRoot: Buffer;
	readonly assetRoot: Buffer;
	readonly eventRoot: Buffer;
	readonly signature: Buffer;
	readonly id: Buffer;
}

export interface BlockAsset {
	module: string;
	data: Buffer;
}

export interface Block {
	header: BlockHeader;
	transactions: Transaction[];
	assets: BlockAsset[];
}
