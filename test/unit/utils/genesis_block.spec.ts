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

import { dataStructures } from '@liskhq/lisk-utils';
import { getRandomBytes, getAddressFromPublicKey, intToBuffer } from '@liskhq/lisk-cryptography';
import {
	migrateLegacyAccount,
	Account,
	DelegateWithVotes,
	LegacyAccount,
	sortAccounts,
	sortByVotesReceived,
} from '../../../src/utils/genesis_block';
import { SQLs } from '../../../src/utils/storage';

const randomLegacyAccount = (params?: Partial<LegacyAccount>): LegacyAccount => ({
	address:
		params?.address ??
		`${getRandomBytes(3)
			.map(b => b)
			.join('')}L`,
	balance:
		params?.balance ??
		getRandomBytes(5)
			.map(b => b)
			.join(''),
	publicKey: params?.publicKey ?? getRandomBytes(16),
	secondPublicKey: params?.secondPublicKey ?? Buffer.alloc(0),
	isDelegate: params?.isDelegate ?? 0,
	username: params?.username ?? '',
	secondSignature: params?.secondSignature ?? 0,
	multimin: params?.multimin ?? 0,
	vote:
		params?.vote ??
		getRandomBytes(5)
			.map(b => b)
			.join(''),
	incomingTxCount: params?.incomingTxCount ?? 3,
	outgoingTxCount: params?.outgoingTxCount ?? 2,
});

const expectAccountMigration = (
	legacyAccount: LegacyAccount,
	newAccount: Account,
	snapshotHeight: number,
) => {
	const eightByteAddress = Buffer.alloc(8);
	eightByteAddress.writeBigUInt64BE(BigInt(legacyAccount.address.slice(0, -1)));

	const expectedAccount = {
		address: legacyAccount.publicKey
			? getAddressFromPublicKey(legacyAccount.publicKey)
			: eightByteAddress,
		dpos: {
			delegate: {
				consecutiveMissedBlocks: 0,
				isBanned: false,
				lastForgedHeight: legacyAccount.username === '' ? 0 : snapshotHeight + 1,
				pomHeights: [],
				totalVotesReceived: BigInt(0),
				username: legacyAccount.username,
			},
			sentVotes: [],
			unlocking: [],
		},
		keys: {
			mandatoryKeys: [],
			optionalKeys: [],
			numberOfSignatures: 0,
		},
		sequence: {
			nonce: BigInt(0),
		},
		token: {
			balance: BigInt(legacyAccount.balance),
		},
	};

	expect(newAccount).toEqual(expectedAccount);
};

describe('utils/genesis_block', () => {
	describe('migrateFromLegacyAccount', () => {
		let accountsMap: dataStructures.BufferMap<Account>;
		let delegatesMap: dataStructures.BufferMap<DelegateWithVotes>;
		let legacyAddressMap: dataStructures.BufferMap<Buffer>;
		let db: any;
		let snapshotHeight: number;

		beforeEach(() => {
			snapshotHeight = 678;
			accountsMap = new dataStructures.BufferMap<Account>();
			delegatesMap = new dataStructures.BufferMap<DelegateWithVotes>();
			legacyAddressMap = new dataStructures.BufferMap<Buffer>();
			db = {
				query: jest.fn(),
				manyOrNone: jest.fn(),
			};
		});

		it('should migrate account to correct structure', async () => {
			const eightBytes = intToBuffer('12345678', 8);
			const eightByteAddress = '12345678L';
			const legacyAccount = randomLegacyAccount({ address: eightByteAddress });

			await migrateLegacyAccount({
				db,
				snapshotHeight,
				legacyAccount,
				accountsMap,
				delegatesMap,
				legacyAddressMap,
			});

			expect(legacyAddressMap.has(eightBytes)).toBeTrue();

			const newAccount = accountsMap.get(legacyAddressMap.get(eightBytes) as Buffer);
			expectAccountMigration(legacyAccount, newAccount as Account, snapshotHeight);
		});

		describe('when account have no incoming transaction', () => {
			it('should return', async () => {
				const legacyAccount = randomLegacyAccount({ incomingTxCount: 0 });

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();
				expect(accountsMap.values()).toHaveLength(0);
				expect(delegatesMap.values()).toHaveLength(0);
				expect(legacyAddressMap.values()).toHaveLength(0);
			});
		});

		describe('when account is a genesis account which has negative balance', () => {
			it('should return', async () => {
				const legacyAccount = randomLegacyAccount({ balance: BigInt(-93833).toString() });

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();
				expect(accountsMap.values()).toHaveLength(0);
				expect(delegatesMap.values()).toHaveLength(0);
				expect(legacyAddressMap.values()).toHaveLength(0);
			});
		});

		describe('when account legacy address is overflowed and account have no public key', () => {
			it('should be converted to equivalent lower range address', async () => {
				const eightByteAddress = '88888888888888888888L';
				const equivalentOverflowedAddress = '0000000000000004';
				const legacyAccount = randomLegacyAccount({ address: eightByteAddress });

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toEqual(
					Buffer.from(equivalentOverflowedAddress, 'hex'),
				);
			});
		});

		describe('when account have at least one outgoing transaction', () => {
			it('should convert its 8 byte address to 20 byte address format', async () => {
				const legacyAccount = randomLegacyAccount({ outgoingTxCount: 1 });

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(20);
			});
		});

		describe('when account have no outgoing transaction', () => {
			it('should use its 8 byte address format', async () => {
				const eightBytes = intToBuffer('12345678', 8);
				const eightByteAddress = '12345678L';
				const legacyAccount = randomLegacyAccount({
					address: eightByteAddress,
					outgoingTxCount: 0,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].address).toEqual(eightBytes);
			});
		});

		describe('when there are duplicate accounts in 8 byte address format and first account has public key', () => {
			it('should add up their balance in one account', async () => {
				const eightByteAddress = '12345678L';
				const legacyAccount1 = randomLegacyAccount({ address: eightByteAddress });

				const eightByteAddressDuplicate = '012345678L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: legacyAccount1,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount2, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(20);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
			});
		});

		describe('when there are duplicate accounts in 8 byte address format and second account has public key', () => {
			it('should add up their balance in one account migrated earlier', async () => {
				const eightByteAddress = '12345678L';
				const legacyAccount1 = randomLegacyAccount({ address: eightByteAddress });

				const eightByteAddressDuplicate = '012345678L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount1, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: legacyAccount2,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
			});
		});

		describe('when there are duplicate accounts in 8 byte address format and both accounts do not has public key', () => {
			it('should add up their balance in one account', async () => {
				const eightByteAddress = '12345678L';
				const legacyAccount1 = randomLegacyAccount({ address: eightByteAddress });

				const eightByteAddressDuplicate = '012345678L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount1, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount2, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
			});
		});

		describe('when there are duplicate accounts in over-flowed range', () => {
			it('should add up their balance in one account and use lower range address', async () => {
				const eightByteAddress = '88888888888888888888L';
				const legacyAccount1 = randomLegacyAccount({ address: eightByteAddress });

				const eightByteAddressDuplicate = '4L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount1, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount2, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
				expect(accountsMap.values()[0].address.toString('hex')).toEqual('0000000000000004');
			});
		});

		describe('when there is more than one duplicate account in 8 byte address format', () => {
			it('should add up their balance in one account', async () => {
				const legacyAccount1 = randomLegacyAccount({ address: '12345678L' });
				const legacyAccount2 = randomLegacyAccount({ address: '012345678L' });
				const legacyAccount3 = randomLegacyAccount({ address: '0012345678L' });

				for (const account of [legacyAccount1, legacyAccount2, legacyAccount3]) {
					await expect(
						migrateLegacyAccount({
							db,
							snapshotHeight,
							legacyAccount: { ...account, publicKey: null },
							accountsMap,
							delegatesMap,
							legacyAddressMap,
						}),
					).resolves.toBeUndefined();
				}

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) +
						BigInt(legacyAccount2.balance) +
						BigInt(legacyAccount3.balance),
				);
			});
		});

		describe('when there are duplicate accounts in 8 byte address format and second account is a delegate', () => {
			it('should add up their balance and skip delegate properties', async () => {
				const eightByteAddress = '12345678L';
				const legacyAccount1 = randomLegacyAccount({ address: eightByteAddress });

				const eightByteAddressDuplicate = '012345678L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
					isDelegate: 1,
					username: 'my-delegate',
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount1, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount2 },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(8);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
				expect(accountsMap.values()[0].dpos.delegate.username).toEqual('');
			});
		});

		describe('when there are duplicate accounts in 8 byte address format and first account is a delegate', () => {
			it('should add up their balance in one account and make it a delegate account', async () => {
				const eightByteAddress = '12345678L';
				const legacyAccount1 = randomLegacyAccount({
					address: eightByteAddress,
					isDelegate: 1,
					username: 'my-delegate',
				});

				const eightByteAddressDuplicate = '012345678L';
				const legacyAccount2 = randomLegacyAccount({
					address: eightByteAddressDuplicate,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount1 },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: { ...legacyAccount2, publicKey: null },
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				expect(accountsMap.values()).toHaveLength(1);
				expect(accountsMap.values()[0].address).toHaveLength(20);
				expect(accountsMap.values()[0].token.balance).toEqual(
					BigInt(legacyAccount1.balance) + BigInt(legacyAccount2.balance),
				);
				expect(accountsMap.values()[0].dpos.delegate.username).toEqual('my-delegate');
			});
		});

		// This will happen if one try to migrate same account (same public key) twice
		describe('when there are duplicate accounts in 20 byte address format', () => {
			it('should throw error', async () => {
				const legacyAccount1 = randomLegacyAccount();
				const legacyAccount2 = randomLegacyAccount({
					publicKey: legacyAccount1.publicKey,
				});

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: legacyAccount1,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).resolves.toBeUndefined();

				await expect(
					migrateLegacyAccount({
						db,
						snapshotHeight,
						legacyAccount: legacyAccount2,
						accountsMap,
						delegatesMap,
						legacyAddressMap,
					}),
				).rejects.toThrowError(
					`Account with publicKey: ${(legacyAccount1.publicKey as Buffer).toString(
						'hex',
					)} already migrated.`,
				);
			});
		});

		describe('when a legacy multisig account with second signature is migrated', () => {
			let legacyAccount: LegacyAccount;
			let newAccount: Account;
			let multiSigKeys: Buffer[];

			beforeEach(async () => {
				multiSigKeys = [
					getRandomBytes(20),
					getRandomBytes(20),
					getRandomBytes(20),
					getRandomBytes(20),
				];

				legacyAccount = randomLegacyAccount({
					secondSignature: 1,
					secondPublicKey: getRandomBytes(20),
					multimin: 3,
				});

				db.manyOrNone.mockResolvedValue(
					multiSigKeys.map(k => ({
						publicKey: k,
					})),
				);

				await migrateLegacyAccount({
					db,
					snapshotHeight,
					legacyAccount,
					accountsMap,
					delegatesMap,
					legacyAddressMap,
				});

				// eslint-disable-next-line prefer-destructuring
				newAccount = accountsMap.values()[0];
			});

			it('should fetch multisig keys from database', () => {
				expect(db.manyOrNone).toBeCalledTimes(1);
				expect(db.manyOrNone).toBeCalledWith(SQLs.getMultisigPublicKeys, {
					address: legacyAccount.address,
				});
			});

			it('should use both public key and second public as mandatory keys', () => {
				expect(newAccount.keys.mandatoryKeys).toIncludeSameMembers([
					legacyAccount.publicKey,
					legacyAccount.secondPublicKey,
				]);
			});

			it('should use existing multisig keys as optional keys', () => {
				expect(newAccount.keys.optionalKeys).toIncludeSameMembers(multiSigKeys);
			});

			it('should use numberOfSignatures more than multimin to include second signature', () => {
				expect(newAccount.keys.numberOfSignatures).toEqual(legacyAccount.multimin + 1);
			});

			it('should have all keys sorted lexicographically', () => {
				expect(newAccount.keys.mandatoryKeys).toEqual(
					newAccount.keys.mandatoryKeys.sort((a, b) => a.compare(b)),
				);
				expect(newAccount.keys.optionalKeys).toEqual(
					newAccount.keys.optionalKeys.sort((a, b) => a.compare(b)),
				);
			});
		});

		describe('when a legacy second signature account is migrated', () => {
			let legacyAccount: LegacyAccount;
			let newAccount: Account;

			beforeEach(async () => {
				legacyAccount = randomLegacyAccount({
					secondSignature: 1,
					secondPublicKey: getRandomBytes(20),
					multimin: 0,
				});

				await migrateLegacyAccount({
					db,
					snapshotHeight,
					legacyAccount,
					accountsMap,
					delegatesMap,
					legacyAddressMap,
				});

				// eslint-disable-next-line prefer-destructuring
				newAccount = accountsMap.values()[0];
			});

			it('should use both public key and second public as mandatory keys', () => {
				expect(newAccount.keys.mandatoryKeys).toIncludeSameMembers([
					legacyAccount.publicKey,
					legacyAccount.secondPublicKey,
				]);
			});

			it('should use existing multisig keys as optional keys', () => {
				expect(newAccount.keys.optionalKeys).toEqual([]);
			});

			it('should use numberOfSignatures = 2', () => {
				expect(newAccount.keys.numberOfSignatures).toEqual(2);
			});

			it('should have all keys sorted lexicographically', () => {
				expect(newAccount.keys.mandatoryKeys).toEqual(
					newAccount.keys.mandatoryKeys.sort((a, b) => a.compare(b)),
				);
				expect(newAccount.keys.optionalKeys).toEqual(
					newAccount.keys.optionalKeys.sort((a, b) => a.compare(b)),
				);
			});
		});

		describe('when a legacy multisig account is migrated', () => {
			let legacyAccount: LegacyAccount;
			let newAccount: Account;
			let multiSigKeys: Buffer[];

			beforeEach(async () => {
				multiSigKeys = [
					getRandomBytes(20),
					getRandomBytes(20),
					getRandomBytes(20),
					getRandomBytes(20),
				];

				legacyAccount = randomLegacyAccount({
					secondSignature: 0,
					secondPublicKey: null,
					multimin: 3,
				});

				db.manyOrNone.mockResolvedValue(
					multiSigKeys.map(k => ({
						publicKey: k,
					})),
				);

				await migrateLegacyAccount({
					db,
					snapshotHeight,
					legacyAccount,
					accountsMap,
					delegatesMap,
					legacyAddressMap,
				});

				// eslint-disable-next-line prefer-destructuring
				newAccount = accountsMap.values()[0];
			});

			it('should fetch multisig keys from database', () => {
				expect(db.manyOrNone).toBeCalledTimes(1);
				expect(db.manyOrNone).toBeCalledWith(SQLs.getMultisigPublicKeys, {
					address: legacyAccount.address,
				});
			});

			it('should use only public key as mandatory keys', () => {
				expect(newAccount.keys.mandatoryKeys).toIncludeSameMembers([legacyAccount.publicKey]);
			});

			it('should use existing multisig keys as optional keys', () => {
				expect(newAccount.keys.optionalKeys).toIncludeSameMembers(multiSigKeys);
			});

			it('should use numberOfSignatures equal to existing multimin', () => {
				expect(newAccount.keys.numberOfSignatures).toEqual(legacyAccount.multimin);
			});

			it('should have all keys sorted lexicographically', () => {
				expect(newAccount.keys.mandatoryKeys).toEqual(
					newAccount.keys.mandatoryKeys.sort((a, b) => a.compare(b)),
				);
				expect(newAccount.keys.optionalKeys).toEqual(
					newAccount.keys.optionalKeys.sort((a, b) => a.compare(b)),
				);
			});
		});

		describe('when a delegate account is migrated', () => {
			let legacyAccount: LegacyAccount;
			let newAccount: Account;

			beforeEach(async () => {
				legacyAccount = randomLegacyAccount({
					isDelegate: 1,
					username: 'my-delegate',
					vote: '12345',
				});

				await migrateLegacyAccount({
					db,
					snapshotHeight,
					legacyAccount,
					accountsMap,
					delegatesMap,
					legacyAddressMap,
				});

				// eslint-disable-next-line prefer-destructuring
				newAccount = accountsMap.values()[0];
			});

			it('should be migrated as delegate account', () => {
				expect(newAccount.dpos.delegate.username).toEqual('my-delegate');
			});

			it('should use zero for totalVotesReceived', () => {
				expect(newAccount.dpos.delegate.totalVotesReceived).toEqual(BigInt(0));
			});

			it('should update votes to delegates map to calculate initDelegates later', () => {
				expect(delegatesMap.values()).toHaveLength(1);
				expect(delegatesMap.values()[0]).toEqual({
					address: newAccount.address,
					votes: BigInt('12345'),
				});
			});
		});
	});

	describe('sortAccounts', () => {
		it('should always sort 8 byte address address above 20 byte address', () => {
			const twentyByteAddress1 = Buffer.from('abcdefghnjhyuiolmjnh', 'utf8');
			const eightByteAddress1 = Buffer.from('abcdefgh', 'utf8');

			const accounts = [twentyByteAddress1, eightByteAddress1].map(
				b => ({ address: b } as Account),
			);

			const correctOrder = [eightByteAddress1, twentyByteAddress1].map(
				a => ({ address: a } as Account),
			);

			expect(accounts.sort(sortAccounts)).toEqual(correctOrder);
		});

		it('should sort two 20 byte address as lexicographically', () => {
			const twentyByteAddress1 = Buffer.from('abcdefghnjhyuiolmjnh', 'utf8');
			const twentyByteAddress2 = Buffer.from('bacdefghnjhyuiolmjnh', 'utf8');
			const eightByteAddress1 = Buffer.from('abcdefgh', 'utf8');

			const accounts = [twentyByteAddress2, eightByteAddress1, twentyByteAddress1].map(
				b => ({ address: b } as Account),
			);

			const correctOrder = [eightByteAddress1, twentyByteAddress1, twentyByteAddress2].map(
				a => ({ address: a } as Account),
			);

			expect(accounts.sort(sortAccounts)).toEqual(correctOrder);
		});

		it('should sort two 8 byte address as lexicographically', () => {
			const twentyByteAddress1 = Buffer.from('abcdefghnjhyuiolmjnh', 'utf8');
			const eightByteAddress1 = Buffer.from('abcdefgh', 'utf8');
			const eightByteAddress2 = Buffer.from('bacdefgh', 'utf8');

			const accounts = [eightByteAddress2, twentyByteAddress1, eightByteAddress1].map(
				b => ({ address: b } as Account),
			);

			const correctOrder = [eightByteAddress1, eightByteAddress2, twentyByteAddress1].map(
				a => ({ address: a } as Account),
			);

			expect(accounts.sort(sortAccounts)).toEqual(correctOrder);
		});
	});

	describe('sortByVotesReceived', () => {
		it('should sort accounts by votes received', () => {
			const delegate1 = {
				address: Buffer.from('abcdefghnjhyuiolmjnh', 'utf8'),
				votes: BigInt(10),
			};
			const delegate2 = { address: Buffer.from('bacdefghnjhyuiolmjnh', 'utf8'), votes: BigInt(11) };
			const delegate3 = { address: Buffer.from('bacdefghnjhyuiolmjnh', 'utf8'), votes: BigInt(50) };
			const delegates = [delegate1, delegate3, delegate2];
			const correctOrder = [delegate3, delegate2, delegate1];

			expect(delegates.sort(sortByVotesReceived)).toEqual(correctOrder);
		});

		it('should sort accounts by address if same votes received', () => {
			const delegate1 = {
				address: Buffer.from('abacdefghnjhyuiolmjnh', 'utf8'),
				votes: BigInt(10),
			};
			const delegate2 = { address: Buffer.from('bacdefghnjhyuiolmjnh', 'utf8'), votes: BigInt(10) };
			const delegates = [delegate2, delegate1];
			const correctOrder = [delegate1, delegate2];

			expect(delegates.sort(sortByVotesReceived)).toEqual(correctOrder);
		});
	});
});
