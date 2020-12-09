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

import cli from 'cli-ux';
import { writeFileSync } from 'fs';
import debugLib from 'debug';
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

const debug = debugLib('lisk_migrator:genesis_block');

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

export interface LegacyAccount {
	readonly address: string;
	readonly publicKey: Buffer | null;
	readonly secondPublicKey: Buffer | null;
	readonly balance: string;
	readonly isDelegate: number;
	readonly username: string;
	readonly secondSignature: number;
	readonly multimin: number;
	readonly vote: string;
	readonly incomingTxCount: number;
	readonly outgoingTxCount: number;
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

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

// Referenced from https://github.com/LiskHQ/lisk-sdk/blob/v2.3.8/framework/src/modules/chain/blocks/block.js#L139
export const getBlockBytes = (block: Block): Buffer => {
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

export const accountDefaultProps = {
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

const MAX_EIGHT_BYTE_UNSIGNED_INTEGER = BigInt(2) ** BigInt(64) - BigInt(1);

export const migrateAddressForAccount = (
	legacyAccount: LegacyAccount,
): { legacyAddress: Buffer; newAddress: Buffer } => {
	// Get integer buffer from format 12345L
	// There are some legacy addresses which have leading zeros e.g. 01234L
	// 		https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/testnet/config.json#L18
	//  	https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/mainnet/config.json#L39
	// this will remove any leading zeros end-up in merging balances of both accounts e.g. 123L and 0123L
	const address = BigInt(legacyAccount.address.slice(0, -1));

	// Try converting it to buffer to check if its overflowed
	const eightByteAddress = Buffer.alloc(8);

	// There are some legacy accounts which address range exceed unit64 limit
	//  	https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/testnet/config.json#L27
	//  	https://github.com/LiskHQ/lisk-sdk/blob/276c968c49bab6dc1267079bfb5a58da546bf22b/framework/test/fixtures/config/mainnet/config.json#L55
	if (address > MAX_EIGHT_BYTE_UNSIGNED_INTEGER) {
		// We decided to convert such overflowed ranges to their respective lower range addresses
		// e.g. 88888888888888888888L will be migrated to 4L
		// this will be achieved by truncating 8 bytes from the right side
		// eslint-disable-next-line no-bitwise
		eightByteAddress.writeBigUInt64BE(address >> BigInt(64));
	} else {
		eightByteAddress.writeBigUInt64BE(address);
	}

	const twentyByteAddress =
		legacyAccount.publicKey && legacyAccount.outgoingTxCount > 0
			? getAddressFromPublicKey(legacyAccount.publicKey)
			: null;

	return { legacyAddress: eightByteAddress, newAddress: twentyByteAddress ?? eightByteAddress };
};

// This function assumes that accounts with public key are migrated first
export const migrateLegacyAccount = async ({
	db,
	legacyAccount,
	snapshotHeight,
	accountsMap,
	delegatesMap,
	legacyAddressMap,
}: {
	db: pgPromise.IDatabase<any>;
	legacyAccount: LegacyAccount;
	accountsMap: dataStructures.BufferMap<Account>;
	delegatesMap: dataStructures.BufferMap<DelegateWithVotes>;
	legacyAddressMap: dataStructures.BufferMap<Buffer>;
	snapshotHeight: number;
}): Promise<void> => {
	debug('Migrating legacy account: ', legacyAccount.address);
	debug({
		incomingTxCount: legacyAccount.incomingTxCount,
		outgoingTxCount: legacyAccount.outgoingTxCount,
		balance: legacyAccount.balance,
	});

	// Its an empty account
	if (legacyAccount.incomingTxCount === 0) {
		debug('No incoming transaction. Skipping.');
		return;
	}

	// Its a genesis account
	if (BigInt(legacyAccount.balance) < BigInt(0)) {
		debug('Its a genesis account. Skipping.');
		return;
	}

	const { legacyAddress, newAddress } = migrateAddressForAccount(legacyAccount);
	debug('New address', newAddress.toString('hex'));

	// If there is an account with public key tried to be migrated twice
	if (accountsMap.has(newAddress) && newAddress.length === 20) {
		throw new Error(
			`Account with publicKey: ${(legacyAccount.publicKey as Buffer).toString(
				'hex',
			)} already migrated.`,
		);
	}

	let duplicateAccount: Account | undefined;

	if (accountsMap.has(newAddress)) {
		duplicateAccount = accountsMap.get(newAddress);
	} else if (legacyAddressMap.has(legacyAddress)) {
		const duplicateAddress = legacyAddressMap.get(legacyAddress) as Buffer;
		duplicateAccount = accountsMap.get(duplicateAddress);
	}

	if (duplicateAccount) {
		debug('Duplicate account detected. Adding up the balance.');
		const duplicateUpdatedAccount = {
			...duplicateAccount,
			token: { balance: duplicateAccount.token.balance + BigInt(legacyAccount.balance) },
		};

		accountsMap.set(duplicateAccount.address, duplicateUpdatedAccount);
		return;
	}

	const basicProps = { address: newAddress };
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
		// Its an initialized account so public key can't be null
		const publicKey = legacyAccount.publicKey as Buffer;
		const keys = await db.manyOrNone(SQLs.getMultisigPublicKeys, {
			address: legacyAccount.address,
		});
		keysProps = {
			keys: {
				mandatoryKeys: sortBufferArray([publicKey, legacyAccount.secondPublicKey as Buffer]),
				optionalKeys: sortBufferArray(keys.map(r => r.publicKey)),
				numberOfSignatures: legacyAccount.multimin + 1,
			},
		};

		// If account is just second signature account
	} else if (legacyAccount.secondSignature && legacyAccount.multimin === 0) {
		// There are few second signature accounts which use same second public key
		// Its an initialized account so public key can't be null
		const publicKey = legacyAccount.publicKey as Buffer;

		if (!publicKey.equals(legacyAccount.secondPublicKey as Buffer)) {
			keysProps = {
				keys: {
					mandatoryKeys: sortBufferArray([publicKey, legacyAccount.secondPublicKey as Buffer]),
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

	debug('New account:', account);

	legacyAddressMap.set(legacyAddress, account.address);
	accountsMap.set(account.address, account);

	if (account.dpos.delegate.username !== '') {
		delegatesMap.set(account.address, {
			address: account.address,
			votes: BigInt(legacyAccount.vote),
		});
	}
};

export const sortByVotesReceived = (a: DelegateWithVotes, b: DelegateWithVotes) => {
	if (a.votes > b.votes) {
		return -1;
	}
	if (a.votes < b.votes) {
		return 1;
	}

	// If accounts have same votes then sort by their address lexicographically
	return a.address.compare(b.address);
};

export const sortAccounts = (a: Account, b: Account) => {
	if (a.address.length < b.address.length) {
		return -1;
	}

	if (a.address.length > b.address.length) {
		return 1;
	}

	return a.address.compare(b.address);
};

interface createGenesisBlockFromStorageParams {
	readonly db: pgPromise.IDatabase<any>;
	readonly snapshotHeight: number;
	readonly epochTime: string;
}

export const createGenesisBlockFromStorage = async ({
	db,
	snapshotHeight,
	epochTime,
}: createGenesisBlockFromStorageParams): Promise<Record<string, unknown>> => {
	// Calculate previousBlockID
	const blockIDSubTreeRoots: Buffer[] = [];
	const blocksBatchSize = 2 ** 16; // This must be power of 2
	const accountsBatchSize = 10000;
	let lastBlock!: Block;

	cli.action.start('Processing blocks to calculate previous block id');
	const blocksStreamParser = (_: unknown, blocksBatch: Block[]) => {
		blockIDSubTreeRoots.push(
			new MerkleTree(blocksBatch.map(block => hash(getBlockBytes(block)))).root,
		);
		lastBlock = blocksBatch[blocksBatch.length - 1];
		debug(
			`Processed block till height: ${lastBlock.height}, Remaining: ${
				snapshotHeight - lastBlock.height
			}`,
		);
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
	cli.action.stop();

	// Calculate accounts
	const progress = cli.progress({
		format: 'Migrating accounts: [{bar}] {percentage}% | {value}/{total} | ETA: {eta}',
		fps: 2,
		synchronousUpdate: false,
		etaAsynchronousUpdate: false,
		barsize: 50,
		stream: process.stdout,
		stopOnComplete: true,
	});
	const accountsMap = new dataStructures.BufferMap<Account>();
	const delegatesMap = new dataStructures.BufferMap<DelegateWithVotes>();
	const legacyAddressMap = new dataStructures.BufferMap<Buffer>();

	let processedAccounts = 0;
	const { totalAccounts } = await db.one(
		'SELECT count(*) as "totalAccounts" FROM mem_accounts_snapshot',
	);
	progress.start(totalAccounts, 0);

	const accountsStreamParser = async (_: unknown, data: LegacyAccount[]) => {
		for (const legacyAccount of data) {
			await migrateLegacyAccount({
				db,
				legacyAccount,
				snapshotHeight,
				accountsMap,
				delegatesMap,
				legacyAddressMap,
			});
			processedAccounts += 1;
			progress.update(processedAccounts);
		}
	};
	await db.stream(
		new QueryStream(
			'SELECT mem_accounts_snapshot.*, (SELECT COUNT(*)::int FROM trs WHERE trs."recipientId" = mem_accounts_snapshot.address) as "incomingTxCount", (SELECT COUNT(*)::int FROM trs WHERE trs."senderId" = mem_accounts_snapshot.address) as "outgoingTxCount" FROM mem_accounts_snapshot ORDER BY mem_accounts_snapshot."publicKey" ASC',
			[],
			{ batchSize: accountsBatchSize },
		),
		async s => streamRead(s, accountsStreamParser),
	);

	await new Promise(resolve => {
		progress.on('stop', () => {
			resolve();
		});
	});

	const accounts = accountsMap.values().sort(sortAccounts);
	const topDelegates = delegatesMap
		.values()
		.sort(sortByVotesReceived)
		.slice(0, 103)
		.map(a => a.address);

	const epochTimeInMs = new Date(epochTime).getTime();
	const lastBlockTimeOffsetInMs = lastBlock.timestamp * 1000;
	const lastBlockTimeInSeconds = (epochTimeInMs + lastBlockTimeOffsetInMs) / 1000;
	const lastBlockTimeToNearest10s = Math.round(lastBlockTimeInSeconds / 10) * 10;

	cli.action.start('Creating genesis block');
	const genesisBlock = createGenesisBlock({
		accounts: accounts as any,
		initRounds: 600, // 10 * 103 * 600 / 60 / 60 / 24 = Approximately 7 days assuming no missed blocks
		initDelegates: topDelegates,
		previousBlockID: merkleRootOfBlocksTillSnapshotHeight,
		height: snapshotHeight + 1,
		timestamp: lastBlockTimeToNearest10s + 7200, // 60 * 60 * 2 seconds, 2 hours in future
		accountAssetSchemas: defaultAccountSchema,
	});
	cli.action.stop();

	return getGenesisBlockJSON({ genesisBlock, accountAssetSchemas: defaultAccountSchema });
};

export const writeGenesisBlock = (
	genesisBlock: Record<string, unknown>,
	filePath: string,
): void => {
	writeFileSync(filePath, JSON.stringify(genesisBlock, null, '\t'));
};
