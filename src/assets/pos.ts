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
import { Database } from '@liskhq/lisk-db';
import { address } from '@liskhq/lisk-cryptography';

import {
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	POS_INIT_ROUNDS,
	ROUND_LENGTH,
	Q96_ZERO,
	MAX_COMMISSION,
	MODULE_NAME_POS,
	EMPTY_STRING,
} from '../constants';

import {
	Account,
	GenesisDataEntry,
	VoteWeightsWrapper,
	VoteWeight,
	DelegateWeight,
	ValidatorEntryBuffer,
	Stake,
	StakerBuffer,
	ValidatorEntry,
	Staker,
	GenesisAssetEntry,
	PoSStoreEntry,
} from '../types';

import { getBlockPublicKeySet } from '../utils/block';
import { getTransactionPublicKeySet } from '../utils/transaction';

const { getLisk32AddressFromAddress, getAddressFromPublicKey } = address;

const ceiling = (a: number, b: number) => {
	if (b === 0) throw new Error('Can not divide by 0.');
	return Math.floor((a + b - 1) / b);
};

export const formatInt = (num: number | bigint): string => {
	let buf: Buffer;
	if (typeof num === 'bigint') {
		if (num < BigInt(0)) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(8);
		buf.writeBigUInt64BE(num);
	} else {
		if (num < 0) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(4);
		buf.writeUInt32BE(num, 0);
	}
	return buf.toString('binary');
};

export const getValidatorKeys = async (
	accounts: Account[],
	db: Database,
	pageSize: number,
): Promise<Record<string, string>> => {
	const delegateSet = new Set();
	for (const account of accounts) {
		if (account.dpos.delegate.username !== '') {
			delegateSet.add(account.address.toString('hex'));
		}
	}

	const blockPublicKeySet = await getBlockPublicKeySet(db, pageSize);
	const txPublicKeySet = await getTransactionPublicKeySet(db, pageSize);

	const keys: Record<string, string> = {};
	for (const key of blockPublicKeySet) {
		keys[getAddressFromPublicKey(Buffer.from(key, 'hex')).toString('hex')] = key;
	}
	for (const key of txPublicKeySet) {
		// if public key included in block, skip
		if (blockPublicKeySet.has(key)) {
			// eslint-disable-next-line no-continue
			continue;
		}
		const trxSenderAddress: string = getAddressFromPublicKey(Buffer.from(key, 'hex')).toString(
			'hex',
		);
		if (delegateSet.has(trxSenderAddress)) {
			keys[trxSenderAddress] = key;
		}
	}
	return keys;
};

export const createValidatorsArrayEntry = async (
	account: Account,
	validatorKeys: Record<string, string>,
	snapshotHeight: number,
	tokenID: string,
): Promise<ValidatorEntryBuffer | null> => {
	if (account.dpos.delegate.username !== EMPTY_STRING) {
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

		return validator;
	}
	return null;
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

export const createStakersArrayEntry = async (
	account: Account,
	tokenID: string,
): Promise<StakerBuffer | null> => {
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
		return staker;
	}
	return null;
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
		throw new Error(`Top delegates for round ${r - 2} (r-2) unavailable, cannot proceed.`);
	}

	const topValidators = voteWeightR2.delegates;

	const initValidators: Buffer[] = [];
	const accountBannedMap = new Map(
		accounts.map(account => [account.address, account.dpos.delegate.isBanned]),
	);

	topValidators.forEach((delegate: DelegateWeight) => {
		const isAccountBanned = accountBannedMap.get(delegate.address);
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

export const getPoSModuleEntry = async (
	validators: ValidatorEntry[],
	stakers: Staker[],
	genesisData: GenesisDataEntry,
): Promise<GenesisAssetEntry> => {
	const posObj: PoSStoreEntry = {
		validators,
		stakers,
		genesisData,
	};

	return {
		module: MODULE_NAME_POS,
		data: (posObj as unknown) as Record<string, unknown>,
		schema: posGenesisStoreSchema,
	};
};
