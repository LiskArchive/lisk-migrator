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
import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { objects, dataStructures } from '@liskhq/lisk-utils';
import { MerkleTree } from '@liskhq/lisk-tree';
import { SQLs, streamRead } from './storage';
import { defaultAccountSchema } from './schema';

const sortBufferArray = (arr: Buffer[]): Buffer[] => arr.sort((a, b) => a.compare(b));

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
	readonly incomingTxCount?: number;
}

interface Account {
	readonly [key: string]: unknown;
	readonly address: Buffer;
	readonly token: {
		readonly balance: bigint;
	};
	readonly dpos: {
		readonly delegate: {
			readonly username: string;
			readonly totalVotesReceived: bigint;
		};
	};
}

const getBlockBytes = (block: Block): Buffer => {
	const capacity =
		4 + // version (int)
		4 + // timestamp (int)
		8 + // previousBlock
		4 + // numberOfTransactions (int)
		8 + // totalAmount (long)
		8 + // totalFee (long)
		8 + // reward (long)
		4 + // payloadLength (int)
		32 + // payloadHash
		32 + // generatorPublicKey
		64 + // blockSignature or unused
		4; // unused

	let offset = 0;
	const byteBuffer = Buffer.alloc(capacity);

	offset = byteBuffer.writeInt32BE(block.version, offset);
	offset = byteBuffer.writeInt32BE(block.timestamp, offset);

	if (block.previousBlock) {
		offset = byteBuffer.writeBigUInt64BE(BigInt(block.previousBlock), offset);
	} else {
		offset = byteBuffer.writeBigUInt64BE(BigInt(0), offset);
	}

	offset = byteBuffer.writeInt32BE(block.numberOfTransactions, offset);
	offset = byteBuffer.writeBigUInt64BE(BigInt(block.totalAmount), offset);
	offset = byteBuffer.writeBigUInt64BE(BigInt(block.totalFee), offset);
	offset = byteBuffer.writeBigUInt64BE(BigInt(block.reward), offset);

	offset = byteBuffer.writeInt32BE(block.payloadLength, offset);
	offset = byteBuffer.write(block.payloadHash.toString('hex'), offset, 'hex');
	offset = byteBuffer.write(block.generatorPublicKey.toString('hex'), offset, 'hex');
	offset = byteBuffer.write(block.generatorPublicKey.toString('hex'), offset, 'hex');

	if (block.blockSignature) {
		offset = byteBuffer.write(block.blockSignature.toString('hex'), offset, 'hex');
	}

	return byteBuffer;
};

const accountDefaultProps = {
	sequence: {
		nonce: 0,
	},
	dpos: {
		delegate: {
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

const genesisAccountPublicKeyMainnet = Buffer.from(
	'd121d3abf5425fdc0f161d9ddb32f89b7750b4bdb0bff7d18b191d4b4bafa6d4',
	'hex',
);

const genesisAccountPublicKeyTestnet = Buffer.from(
	'73ec4adbd8f99f0d46794aeda3c3d86b245bd9d27be2b282cdd38ad21988556b',
	'hex',
);

const migrateFromLegacyAccount = async ({
	db,
	legacyAccount,
	snapshotHeight,
	accountsMap,
}: {
	db: pgPromise.IDatabase<any>;
	legacyAccount: LegacyAccount;
	accountsMap: dataStructures.BufferMap<Account>;
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

	if (
		legacyAccount.publicKey?.equals(genesisAccountPublicKeyMainnet) ||
		legacyAccount.publicKey?.equals(genesisAccountPublicKeyTestnet)
	) {
		return;
	}

	const address = legacyAccount.publicKey
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
};

const sortByVotesRecevied = (a: Account, b: Account) => {
	if (a.dpos.delegate.totalVotesReceived > b.dpos.delegate.totalVotesReceived) {
		return 1;
	}
	if (a.dpos.delegate.totalVotesReceived < b.dpos.delegate.totalVotesReceived) {
		return -1;
	}
	return 0;
};

const sortByAddress = (a: Account, b: Account) => a.address.compare(b.address);

export const createGenesisBlockFromStorage = async (
	db: pgPromise.IDatabase<any>,
	snapshotHeight: number,
): Promise<Record<string, unknown>> => {
	// Calcualte previousBlockID
	const blockIDSubTreeRoots: Buffer[] = [];
	const blocksBatchSize = 2 ** 16; // This must be power of 2
	const accountsBatchSize = 10000;
	const blocksStreamParser = (_: unknown, blocksBatch: Block[]) => {
		blockIDSubTreeRoots.push(
			new MerkleTree(blocksBatch.map(block => hash(getBlockBytes(block)))).root,
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

	// Calcualte accounts
	const accountsMap = new dataStructures.BufferMap<Account>();
	const accountsStreamParser = async (_: unknown, data: LegacyAccount[]) => {
		for (const legacyAccount of data) {
			await migrateFromLegacyAccount({ db, legacyAccount, snapshotHeight, accountsMap });
		}
	};
	await db.stream(
		new QueryStream(
			'select mem_accounts_snapshot.*, (select COUNT(*) from trs where trs."recipientId" = mem_accounts_snapshot.address) as "incomingTxCount" from mem_accounts_snapshot;',
			[],
			{ batchSize: accountsBatchSize },
		),
		async s => streamRead(s, accountsStreamParser),
	);

	const accounts = accountsMap.values().sort(sortByAddress);
	const topDelegates = accounts
		.filter(a => a.dpos.delegate.username !== '')
		.sort(sortByVotesRecevied)
		.slice(0, 103)
		.map(a => a.address);

	const genesisBlock = createGenesisBlock({
		accounts: accounts as any,
		initRounds: 600,
		initDelegates: topDelegates,
		previousBlockID: merkleRootOfBlocksTillSnapshotHeight,
		height: snapshotHeight + 1,
		roundLength: 103,
		accountAssetSchemas: defaultAccountSchema,
	});

	return getGenesisBlockJSON({ genesisBlock, accountAssetSchemas: defaultAccountSchema });
};
