/*
 * Copyright © 2022 Lisk Foundation
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
import { Readable } from 'stream';
import { when } from 'jest-when';

import { hash, getKeys, getFirstEightBytesReversed } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { KVStore, formatInt } from '@liskhq/lisk-db';
import { CreateAsset } from '../../src/createAsset';
import {
	DB_KEY_CHAIN_STATE,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_BLOCKS_HEIGHT,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
	CHAIN_STATE_DELEGATE_VOTE_WEIGHTS,
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
	MODULE_NAME_LEGACY,
	MODULE_NAME_AUTH,
	MODULE_NAME_TOKEN,
	MODULE_NAME_DPOS,
} from '../../src/constants';
import { accountSchema, unregisteredAddressesSchema, voteWeightsSchema } from '../../src/schemas';

import { createFakeDefaultAccount } from './utils/account';

import {
	UnregisteredAccount,
	Account,
	GenesisAssetEntry,
	DecodedVoteWeights,
} from '../../src/types';

jest.mock('@liskhq/lisk-db');

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = getKeys(passphrase);
	return getFirstEightBytesReversed(hash(publicKey));
};

describe('Build assets/legacy', () => {
	let db: any;
	let accounts: Account[];
	let createAsset: any;
	let unregisteredAddresses: UnregisteredAccount[];
	let encodedUnregisteredAddresses: Buffer;
	let delegates: DecodedVoteWeights;
	let encodedVoteWeights: Buffer;
	const snapshotHeight = 103;

	interface Accounts {
		[key: string]: {
			passphrase: string;
		};
	}

	const testAccounts: Accounts = {
		account1: {
			passphrase: 'float slow tiny rubber seat lion arrow skirt reveal garlic draft shield',
		},
		account2: {
			passphrase: 'hand nominee keen alarm skate latin seek fox spring guilt loop snake',
		},
		account3: {
			passphrase: 'february large secret save risk album opera rebel tray roast air captain',
		},
	};

	describe('createAsset', () => {
		beforeAll(async () => {
			db = new KVStore('testDB');
			createAsset = new CreateAsset(db);

			for (const account of Object.values(testAccounts)) {
				unregisteredAddresses = [];
				unregisteredAddresses.push({
					address: getLegacyBytesFromPassphrase(account.passphrase),
					balance: BigInt(Math.floor(Math.random() * 1000)),
				});
			}

			encodedUnregisteredAddresses = await codec.encode(unregisteredAddressesSchema, {
				unregisteredAddresses,
			});

			accounts = [
				createFakeDefaultAccount({
					address: Buffer.from('cc96c0a5db38b968f563e7af6fb435585c889111', 'hex'),
					token: {
						balance: BigInt('0'),
					},
					sequence: {
						nonce: BigInt('0'),
					},
					keys: {
						mandatoryKeys: [],
						optionalKeys: [],
						numberOfSignatures: 0,
					},
					dpos: {
						delegate: {
							username: '',
							pomHeights: [],
							consecutiveMissedBlocks: 0,
							lastForgedHeight: 0,
							isBanned: false,
							totalVotesReceived: BigInt('0'),
						},
						sentVotes: [],
						unlocking: [],
					},
				}),
				createFakeDefaultAccount({
					address: Buffer.from('584dd8a902822a9469fb2911fcc14ed5fd98220d', 'hex'),
					keys: {
						mandatoryKeys: [
							Buffer.from(
								'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
								'hex',
							),
						],
						optionalKeys: [],
						numberOfSignatures: 3,
					},
					token: {
						balance: BigInt('0'),
					},
					sequence: {
						nonce: BigInt('0'),
					},
					dpos: {
						delegate: {
							username: '',
							pomHeights: [],
							consecutiveMissedBlocks: 0,
							lastForgedHeight: 0,
							isBanned: false,
							totalVotesReceived: BigInt('0'),
						},
						sentVotes: [],
						unlocking: [],
					},
				}),
			];

			delegates = {
				voteWeights: [
					{
						round: 103,
						delegates: [
							{
								address: Buffer.from('b8982f66903a6bfa5d6994c08ddf97707200d316', 'hex'),
								voteWeight: BigInt('2130000000000'),
							},
							{
								address: Buffer.from('f1b5b0c9d35957ca463b817467782ffa5d2e6945'),
								voteWeight: BigInt('5304000000000'),
							},
						],
					},
				],
			};
			encodedVoteWeights = await codec.encode(voteWeightsSchema, delegates);
		});

		it('should create assets', async () => {
			when(db.get)
				.calledWith(`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`)
				.mockResolvedValue(encodedUnregisteredAddresses as never);

			const encodedAccount = await codec.encode(accountSchema, accounts[0]);
			when(db.createReadStream)
				.calledWith({
					gte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 0).toString('binary')}`,
					lte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(20, 255).toString('binary')}`,
				})
				.mockReturnValue(Readable.from([{ value: Buffer.from(encodedAccount) }]));

			when(db.createReadStream)
				.calledWith({
					gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(HEIGHT_PREVIOUS_SNAPSHOT_BLOCK + 1)}`,
					lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`,
				})
				.mockReturnValue(Readable.from([]));

			when(db.get)
				.calledWith(`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_DELEGATE_VOTE_WEIGHTS}`)
				.mockResolvedValue(encodedVoteWeights as never);

			const response = await createAsset.init(snapshotHeight);

			const moduleList = [
				MODULE_NAME_LEGACY,
				MODULE_NAME_AUTH,
				MODULE_NAME_TOKEN,
				MODULE_NAME_DPOS,
			];
			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(db.createReadStream).toHaveBeenCalledTimes(2);
			expect(response).toHaveLength(4);

			response.forEach((asset: GenesisAssetEntry) => expect(moduleList).toContain(asset.module));
		});
	});
});
