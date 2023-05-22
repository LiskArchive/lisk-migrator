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
import { posGenesisStoreSchema } from 'lisk-framework';
import { KVStore, formatInt } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { BlockHeader, Transaction } from '@liskhq/lisk-chain';
import { getLisk32AddressFromAddress, getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import {
	MODULE_NAME_POS,
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	POS_INIT_ROUNDS,
	ROUND_LENGTH,
	Q96_ZERO,
	MAX_COMMISSION,
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_BLOCKS_ID,
} from '../constants';

import {
	Account,
	GenesisAssetEntry,
	GenesisDataEntry,
	VoteWeightsWrapper,
	VoteWeight,
	DelegateWeight,
	ValidatorEntry,
	ValidatorEntryBuffer,
	Staker,
	Stake,
	PoSStoreEntry,
	StakerBuffer,
} from '../types';

import { blockHeaderSchema } from '../schemas';
import { getBlocksIDsFromDBStream } from '../utils/block';
import { getTransactions, keyString } from '../utils/transaction';

const ceiling = (a: number, b: number) => {
	if (b === 0) throw new Error('Can not divide by 0.');
	return Math.floor((a + b - 1) / b);
};

export const getValidatorKeys = async (
	accounts: Account[],
	snapshotHeight: number,
	snapshotHeightPrevious: number,
	db: KVStore,
): Promise<Record<string, string>> => {
	const keys: Record<string, string> = {};

	const blocksStream = db.createReadStream({
		gte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeightPrevious + 1)}`,
		lte: `${DB_KEY_BLOCKS_HEIGHT}:${formatInt(snapshotHeight)}`,
	});

	const blockIDs: Buffer[] = await getBlocksIDsFromDBStream(blocksStream);

	for (const id of blockIDs) {
		const blockHeaderBuffer = await db.get(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`);
		const blockHeader: BlockHeader = codec.decode(blockHeaderSchema, blockHeaderBuffer);
		const payload = ((await getTransactions(id, db)) as unknown) as Transaction[];

		const base32Address: string = getAddressFromPublicKey(blockHeader.generatorPublicKey).toString(
			'hex',
		);
		keys[base32Address] = blockHeader.generatorPublicKey.toString('hex');
		for (const trx of payload) {
			const trxSenderAddress: string = getAddressFromPublicKey(trx.senderPublicKey).toString('hex');
			const account: Account | undefined = accounts.find(
				acc => acc.address.toString('hex') === trxSenderAddress,
			);
			if (account?.dpos.delegate.username) {
				keys[trxSenderAddress] = trx.senderPublicKey.toString('hex');
			}
		}
	}

	return keys;
};

export const createValidatorsArray = async (
	accounts: Account[],
	snapshotHeight: number,
	snapshotHeightPrevious: number,
	tokenID: string,
	db: KVStore,
): Promise<ValidatorEntry[]> => {
	const validators: ValidatorEntryBuffer[] = [];
	const validatorKeys = await getValidatorKeys(
		accounts,
		snapshotHeight,
		snapshotHeightPrevious,
		db,
	);

	for (const account of accounts) {
		if (account.dpos.delegate.username !== '') {
			const validatorAddress = account.address.toString('hex');

			const validator: ValidatorEntryBuffer = Object.freeze({
				address: account.address,
				name: account.dpos.delegate.username,
				blsKey: INVALID_BLS_KEY,
				proofOfPossession: DUMMY_PROOF_OF_POSSESSION,
				generatorKey: validatorKeys[validatorAddress] || INVALID_ED25519_KEY,
				lastGeneratedHeight: account.dpos.delegate.lastForgedHeight,
				isBanned: true,
				reportMisbehaviorHeights: account.dpos.delegate.pomHeights,
				consecutiveMissedBlocks: account.dpos.delegate.consecutiveMissedBlocks,
				lastCommissionIncreaseHeight: snapshotHeight,
				commission: MAX_COMMISSION,
				sharingCoefficients: [
					{
						tokenID,
						coefficient: Q96_ZERO,
					},
				],
			});
			validators.push(validator);
		}
	}

	const sortedValidators = validators
		.sort((a, b) => a.address.compare(b.address))
		.map(entry => ({
			...entry,
			address: getLisk32AddressFromAddress(entry.address),
		}));

	return sortedValidators;
};

export const getStakes = async (account: Account, tokenID: string): Promise<Stake[]> => {
	const stakes = account.dpos.sentVotes.map(vote => ({
		...vote,
		sharingCoefficients: [
			{
				tokenID,
				coefficient: Q96_ZERO,
			},
		],
	}));

	const sortedStakes = stakes
		.sort((a, b) => a.delegateAddress.compare(b.delegateAddress))
		.map(({ delegateAddress, ...entry }) => ({
			...entry,
			validatorAddress: getLisk32AddressFromAddress(delegateAddress),
		}));

	return sortedStakes;
};

export const createStakersArray = async (
	accounts: Account[],
	tokenID: string,
): Promise<Staker[]> => {
	const stakers: StakerBuffer[] = [];
	for (const account of accounts) {
		if (account.dpos.sentVotes.length || account.dpos.unlocking.length) {
			const staker: StakerBuffer = {
				address: account.address,
				stakes: await getStakes(account, tokenID),
				pendingUnlocks: account.dpos.unlocking.map(
					({ delegateAddress, unvoteHeight, ...unlock }) => ({
						validatorAddress: getLisk32AddressFromAddress(delegateAddress),
						amount: unlock.amount,
						unstakeHeight: unvoteHeight,
					}),
				),
			};
			stakers.push(staker);
		}
	}

	const sortedStakers = stakers
		.sort((a, b) => a.address.compare(b.address))
		.map(({ address, ...entry }) => ({
			...entry,
			address: getLisk32AddressFromAddress(address),
		}));

	return sortedStakers;
};

export const createGenesisDataObj = async (
	accounts: Account[],
	delegatesVoteWeights: VoteWeightsWrapper,
	snapshotHeight: number,
): Promise<GenesisDataEntry> => {
	const r = ceiling(snapshotHeight, ROUND_LENGTH);

	const voteWeightR2 = delegatesVoteWeights.voteWeights.find(
		(voteWeight: VoteWeight) => voteWeight.round === r - 2,
	);

	if (!voteWeightR2 || voteWeightR2.delegates.length === 0) {
		throw new Error(`Top delegates for round ${r - 2}(r-2)  unavailable, cannot proceed.`);
	}

	const topValidators = voteWeightR2.delegates;

	const initValidators: Buffer[] = [];
	const accountbannedMap = new Map(
		accounts.map(account => [account.address, account.dpos.delegate.isBanned]),
	);

	topValidators.forEach((delegate: DelegateWeight) => {
		const isAccountBanned = accountbannedMap.get(delegate.address);
		if (!isAccountBanned) {
			initValidators.push(delegate.address);
		}
	});

	const sortedInitValidators = initValidators.sort((a, b) => a.compare(b)).slice(0, 101);

	const genesisDataObj: GenesisDataEntry = {
		initRounds: POS_INIT_ROUNDS,
		initValidators: sortedInitValidators.map(entry => getLisk32AddressFromAddress(entry)),
	};

	return genesisDataObj;
};

export const addPoSModuleEntry = async (
	accounts: Account[],
	delegatesVoteWeights: VoteWeightsWrapper,
	snapshotHeight: number,
	snapshotHeightPrevious: number,
	tokenID: string,
	db: KVStore,
): Promise<GenesisAssetEntry> => {
	const posObj: PoSStoreEntry = {
		validators: await createValidatorsArray(
			accounts,
			snapshotHeight,
			snapshotHeightPrevious,
			tokenID,
			db,
		),
		stakers: await createStakersArray(accounts, tokenID),
		genesisData: await createGenesisDataObj(accounts, delegatesVoteWeights, snapshotHeight),
	};

	return {
		module: MODULE_NAME_POS,
		data: (posObj as unknown) as Record<string, unknown>,
		schema: posGenesisStoreSchema,
	};
};
