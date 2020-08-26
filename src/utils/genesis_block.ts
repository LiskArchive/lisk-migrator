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

import pgPromise from 'pg-promise';
import QueryStream from 'pg-query-stream';
import { createGenesisBlock, getGenesisBlockJSON } from '@liskhq/lisk-genesis';
import {
	getAddressFromPublicKey,
	hash,
	intToBuffer,
	LITTLE_ENDIAN,
	BIG_ENDIAN,
} from '@liskhq/lisk-cryptography';
import { objects, dataStructures } from '@liskhq/lisk-utils';
import { MerkleTree } from '@liskhq/lisk-tree';
import { SQLs, streamRead } from './storage';
import { defaultAccountSchema } from './schema';

const sortBufferArray = (arr: Buffer[]): Buffer[] => arr.sort((a, b) => a.compare(b));

export interface DelegateWithVotes {
	readonly address: Buffer;
	readonly votes: bigint;
}

interface Block {
	readonly version: number;
	readonly height: number;
	readonly timestamp: number;
	readonly previousBlock?: string;
	readonly numberOfTransactions: number;
	readonly totalAmount: string;
	readonly totalFee: string;
	readonly reward: string;
	readonly payloadLength: number;
	readonly payloadHash: Buffer;
	readonly generatorPublicKey: Buffer;
	readonly blockSignature: Buffer;
}

interface LegacyAccount {
	readonly address: string;
	readonly publicKey: Buffer;
	readonly secondPublicKey: Buffer;
	readonly balance: string;
	readonly isDelegate: number;
	readonly username: string;
	readonly secondSignature: number;
	readonly multimin: number;
	readonly vote: string;
	readonly incomingTxCount: number;
	readonly outgoingTxCount: number;
}

interface Account {
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

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

// Referenced from https://github.com/LiskHQ/lisk-sdk/blob/v2.3.8/framework/src/modules/chain/blocks/block.js#L139
const getBlockBytes = (block: Block): Buffer => {
	const blockVersionBuffer = intToBuffer(block.version, SIZE_INT32, LITTLE_ENDIAN);

	const timestampBuffer = intToBuffer(block.timestamp, SIZE_INT32, LITTLE_ENDIAN);

	const previousBlockBuffer = block.previousBlock
		? intToBuffer(block.previousBlock, SIZE_INT64, BIG_ENDIAN)
		: Buffer.alloc(SIZE_INT64);

	const numTransactionsBuffer = intToBuffer(block.numberOfTransactions, SIZE_INT32, LITTLE_ENDIAN);

	const totalAmountBuffer = intToBuffer(block.totalAmount.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const totalFeeBuffer = intToBuffer(block.totalFee.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const rewardBuffer = intToBuffer(block.reward.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const payloadLengthBuffer = intToBuffer(block.payloadLength, SIZE_INT32, LITTLE_ENDIAN);

	const blockSignatureBuffer = block.blockSignature ?? Buffer.alloc(0);

	return Buffer.concat([
		blockVersionBuffer,
		timestampBuffer,
		previousBlockBuffer,
		numTransactionsBuffer,
		totalAmountBuffer,
		totalFeeBuffer,
		rewardBuffer,
		payloadLengthBuffer,
		block.payloadHash,
		block.generatorPublicKey,
		blockSignatureBuffer,
	]);
};

const accountDefaultProps = {
	token: {
		balance: BigInt(0),
	},
	sequence: {
		nonce: BigInt(0),
	},
	dpos: {
		delegate: {
			lastForgedHeight: 0,
			username: '',
			pomHeights: [],
			consecutiveMissedBlocks: 0,
			isBanned: false,
			totalVotesReceived: BigInt(0),
		},
		sentVotes: [],
		unlocking: [],
	},
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
};

const migrateFromLegacyAccount = async ({
	db,
	legacyAccount,
	snapshotHeight,
	accountsMap,
	delegatesMap,
}: {
	db: pgPromise.IDatabase<any>;
	legacyAccount: LegacyAccount;
	accountsMap: dataStructures.BufferMap<Account>;
	delegatesMap: dataStructures.BufferMap<DelegateWithVotes>;
	snapshotHeight: number;
}): Promise<void> => {
	if (legacyAccount.incomingTxCount === 0) {
		return;
	}

	const eightByteAddress = Buffer.alloc(8);
	try {
		eightByteAddress.writeBigUInt64BE(BigInt(legacyAccount.address.slice(0, -1)));
	} catch (error) {
		// There are some legacy accounts which address range exceed unit64 limit
		//  since no key pair can ever generate such accounts addresses so we can remove those accounts
		//  https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/testnet/config.json#L27
		//  https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/mainnet/config.json#L55
		if (error.code && error.code === 'ERR_OUT_OF_RANGE') {
			return;
		}
	}

	// Its a genesis account
	if (BigInt(legacyAccount.balance) < BigInt(0)) {
		return;
	}

	const address =
		legacyAccount.publicKey && legacyAccount.outgoingTxCount > 0
			? getAddressFromPublicKey(legacyAccount.publicKey)
			: eightByteAddress;

	if (accountsMap.has(address)) {
		const oldAccount = accountsMap.get(address) as Account;
		const updatedAccount = objects.mergeDeep(oldAccount, {
			token: { balance: oldAccount.token.balance + BigInt(legacyAccount.balance) },
		}) as Account;
		accountsMap.set(address, updatedAccount);
		return;
	}

	const basicProps = { address };
	const tokenProps = { token: { balance: BigInt(legacyAccount.balance) } };
	const dposProps = {
		dpos: {
			delegate: {
				username: legacyAccount.isDelegate ? legacyAccount.username : '',
				lastForgedHeight: snapshotHeight + 1,
			},
		},
	};
	let keysProps = {};

	// If its a second signature account & multisig account
	if (legacyAccount.secondSignature && legacyAccount.multimin > 0) {
		const keys = await db.manyOrNone(SQLs.getMultisigPublicKeys, {
			address: legacyAccount.address,
		});
		keysProps = {
			keys: {
				mandatoryKeys: sortBufferArray([legacyAccount.publicKey, legacyAccount.secondPublicKey]),
				optionalKeys: sortBufferArray(keys.map(r => r.publicKey)),
				numberOfSignatures: legacyAccount.multimin + 1,
			},
		};

		// If account is just second signature account
	} else if (legacyAccount.secondSignature && legacyAccount.multimin === 0) {
		// There are few second signature accounts which use same second public key
		if (!legacyAccount.publicKey.equals(legacyAccount.secondPublicKey)) {
			keysProps = {
				keys: {
					mandatoryKeys: sortBufferArray([legacyAccount.publicKey, legacyAccount.secondPublicKey]),
					optionalKeys: [],
					numberOfSignatures: 2,
				},
			};
		}

		// If account is just multisig account
	} else if (!legacyAccount.secondSignature && legacyAccount.multimin > 0) {
		const keys = await db.manyOrNone(SQLs.getMultisigPublicKeys, {
			address: legacyAccount.address,
		});
		keysProps = {
			keys: {
				optionalKeys: sortBufferArray(keys.map(r => r.publicKey)),
				mandatoryKeys: [legacyAccount.publicKey],
				numberOfSignatures: legacyAccount.multimin,
			},
		};
	}

	const account = objects.mergeDeep(
		{},
		accountDefaultProps,
		basicProps,
		tokenProps,
		dposProps,
		keysProps,
	) as Account;

	accountsMap.set(account.address, account);

	if (account.dpos.delegate.username !== '') {
		delegatesMap.set(account.address, {
			address: account.address,
			votes: BigInt(legacyAccount.vote),
		});
	}
};

const sortByVotesRecevied = (a: DelegateWithVotes, b: DelegateWithVotes) => {
	if (a.votes > b.votes) {
		return 1;
	}
	if (a.votes < b.votes) {
		return -1;
	}

	return a.address.compare(b.address);
};

const sortAccounts = (a: Account, b: Account) => {
	if (a.address.length < b.address.length) {
		return 1;
	}

	if (a.address.length > b.address.length) {
		return -1;
	}

	return a.address.compare(b.address);
};

interface createGenesisBlockFromStorageParams {
	readonly db: pgPromise.IDatabase<any>;
	readonly snapshotHeight: number;
	readonly epochTime: string;
	readonly blockTime: number;
}

export const createGenesisBlockFromStorage = async ({
	db,
	snapshotHeight,
	epochTime,
	blockTime,
}: createGenesisBlockFromStorageParams): Promise<Record<string, unknown>> => {
	// Calcualte previousBlockID
	const blockIDSubTreeRoots: Buffer[] = [];
	const blocksBatchSize = 2 ** 16; // This must be power of 2
	const accountsBatchSize = 10000;
	let lastBlock!: Block;

	const blocksStreamParser = (_: unknown, blocksBatch: Block[]) => {
		blockIDSubTreeRoots.push(
			new MerkleTree(blocksBatch.map(block => hash(getBlockBytes(block)))).root,
		);
		lastBlock = blocksBatch[blocksBatch.length - 1];
	};
	await db.stream(
		new QueryStream(
			'SELECT * FROM blocks WHERE height <= $1 ORDER BY height ASC',
			[snapshotHeight],
			{ batchSize: blocksBatchSize },
		),
		async s => streamRead(s, blocksStreamParser),
	);
	const merkleRootOfBlocksTillSnapshotHeight = new MerkleTree(blockIDSubTreeRoots, {
		preHashedLeaf: true,
	}).root;

	// Calcualte accounts
	const accountsMap = new dataStructures.BufferMap<Account>();
	const delegatesMap = new dataStructures.BufferMap<DelegateWithVotes>();
	const accountsStreamParser = async (_: unknown, data: LegacyAccount[]) => {
		for (const legacyAccount of data) {
			await migrateFromLegacyAccount({
				db,
				legacyAccount,
				snapshotHeight,
				accountsMap,
				delegatesMap,
			});
		}
	};
	await db.stream(
		new QueryStream(
			'SELECT mem_accounts_snapshot.*, (SELECT COUNT(*) FROM trs WHERE trs."recipientId" = mem_accounts_snapshot.address) as "incomingTxCount", (SELECT COUNT(*) FROM trs WHERE trs."senderId" = mem_accounts_snapshot.address) as "outgoingTxCount" FROM mem_accounts_snapshot',
			[],
			{ batchSize: accountsBatchSize },
		),
		async s => streamRead(s, accountsStreamParser),
	);

	const accounts = accountsMap.values().sort(sortAccounts);
	const topDelegates = delegatesMap
		.values()
		.sort(sortByVotesRecevied)
		.slice(0, 103)
		.map(a => a.address);

	const epochTimeInMs = new Date(epochTime).getTime();
	const lastBlockTimeOffsetInMs = lastBlock.height * blockTime * 1000;
	const lastBlockTimeInSeconds = (epochTimeInMs + lastBlockTimeOffsetInMs) / 1000;
	const lastBlockTimeToNearest10s = Math.round(lastBlockTimeInSeconds / 10) * 10;

	const genesisBlock = createGenesisBlock({
		accounts: accounts as any,
		initRounds: 600, // Approximately 7 days assuming no missed blocks
		initDelegates: topDelegates,
		previousBlockID: merkleRootOfBlocksTillSnapshotHeight,
		height: snapshotHeight + 1,
		roundLength: 103,
		timestamp: lastBlockTimeToNearest10s + 7200, // 2 hours in future
		accountAssetSchemas: defaultAccountSchema,
	});

	return getGenesisBlockJSON({ genesisBlock, accountAssetSchemas: defaultAccountSchema });
};
