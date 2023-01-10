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

import {
	getLisk32AddressFromAddress,
	getLisk32AddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { Block } from '@liskhq/lisk-chain';

import {
	MODULE_NAME_DPOS,
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	DPOS_INIT_ROUNDS,
	ROUND_LENGTH,
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
	Q96_ZERO,
} from '../constants';

import {
	Account,
	GenesisAssetEntry,
	ValidatorEntry,
	Voter,
	GenesisDataEntry,
	DecodedVoteWeights,
	VoteWeight,
	DelegateWeight,
	SentVote,
} from '../types';
import { genesisDPoSSchema } from '../schemas';

export const getValidatorKeys = async (
	blocks: Block[],
	accounts: Account[],
): Promise<Record<string, string>> => {
	const keys: Record<string, string> = {};
	for (const block of blocks) {
		const lskAddress: string = getLisk32AddressFromPublicKey(block.header.generatorPublicKey);
		keys[lskAddress] = block.header.generatorPublicKey.toString('hex');
		for (const trx of block.payload) {
			const trxSenderAddress: string = getLisk32AddressFromPublicKey(trx.senderPublicKey);
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
	blocks: Block[],
	snapshotHeight: number,
	tokenID: string,
): Promise<ValidatorEntry[]> => {
	const validators: ValidatorEntry[] = [];
	const validatorKeys = await getValidatorKeys(blocks, accounts);

	for (const account of accounts) {
		if (account.dpos.delegate.username !== '') {
			const validatorAddress = getLisk32AddressFromAddress(account.address);
			const validator: ValidatorEntry = {
				address: validatorAddress,
				name: '',
				blsKey: INVALID_BLS_KEY,
				proofOfPossession: DUMMY_PROOF_OF_POSSESSION,
				generatorKey: '',
				lastGeneratedHeight: 0,
				isBanned: true,
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastCommissionIncreaseHeight: snapshotHeight,
				commission: 10000,
				sharingCoefficients: {
					tokenID,
					coefficient: Q96_ZERO,
				},
			};
			if (validatorKeys[validatorAddress]) {
				validator.generatorKey = validatorKeys[validatorAddress];
			} else {
				validator.generatorKey = INVALID_ED25519_KEY;
			}
			validator.name = account.dpos.delegate.username;
			validator.lastGeneratedHeight = account.dpos.delegate.lastForgedHeight;
			validator.pomHeights = account.dpos.delegate.pomHeights;
			validator.consecutiveMissedBlocks = account.dpos.delegate.consecutiveMissedBlocks;
			validators.push(validator);
		}
	}
	return validators;
};

export const getSentVotes = async (account: Account, tokenID: string): Promise<SentVote[]> => {
	const sentVotes = account.dpos.sentVotes.map(vote => ({
		...vote,
		delegateAddress: getLisk32AddressFromAddress(vote.delegateAddress),
		voteSharingCoefficients: [
			{
				tokenID,
				coefficient: Q96_ZERO,
			},
		],
	}));

	return sentVotes;
};

export const createVotersArray = async (accounts: Account[], tokenID: string): Promise<Voter[]> => {
	const voters: Voter[] = [];
	for (const account of accounts) {
		if (account.dpos.sentVotes.length || account.dpos.unlocking.length) {
			const voter: Voter = {
				address: getLisk32AddressFromAddress(account.address),
				sentVotes: await getSentVotes(account, tokenID),
				pendingUnlocks: account.dpos.unlocking.map(unlock => ({
					delegateAddress: getLisk32AddressFromAddress(unlock.delegateAddress),
					amount: unlock.amount,
					unvoteHeight: unlock.unvoteHeight,
				})),
			};
			voters.push(voter);
		}
	}
	return voters;
};

export const createGenesisDataObj = async (
	accounts: Account[],
	delegatesVoteWeights: DecodedVoteWeights,
	snapshotHeight: number,
): Promise<GenesisDataEntry> => {
	const r = Math.ceil((snapshotHeight - HEIGHT_PREVIOUS_SNAPSHOT_BLOCK) / ROUND_LENGTH);
	const voteWeightR2 = delegatesVoteWeights.voteWeights.find(
		(voteWeight: VoteWeight) => voteWeight.round === r - 2,
	);
	if (!voteWeightR2 || voteWeightR2.delegates.length === 0) {
		throw new Error(`Top delegates for round r-2 (${r - 2}) unavailable, cannot proceed.`);
	}

	const topDelegates = voteWeightR2.delegates;

	const initDelegates: Buffer[] = [];
	const accountMap = new Map(accounts.map(account => [account.address.toString('hex'), account]));

	topDelegates.forEach((delegate: DelegateWeight) => {
		const account = accountMap.get(delegate.address.toString('hex'));
		if (account && !account.dpos.delegate.isBanned) {
			initDelegates.push(delegate.address);
		}
	});

	// Verify
	const sortedInitDelegates = initDelegates.slice(0, 101).sort((a, b) => a.compare(b));

	const genesisDataObj: GenesisDataEntry = {
		initRounds: DPOS_INIT_ROUNDS,
		initDelegates: sortedInitDelegates.map(entry => getLisk32AddressFromAddress(entry)),
	};

	return genesisDataObj;
};

export const addDPoSModuleEntry = async (
	accounts: Account[],
	blocks: Block[],
	delegatesVoteWeights: DecodedVoteWeights,
	snapshotHeight: number,
	tokenID: string,
): Promise<GenesisAssetEntry> => {
	const dposObj = {
		validators: await createValidatorsArray(accounts, blocks, snapshotHeight, tokenID),
		voters: await createVotersArray(accounts, tokenID),
		genesisData: await createGenesisDataObj(accounts, delegatesVoteWeights, snapshotHeight),
	};

	return {
		module: MODULE_NAME_DPOS,
		data: dposObj,
		schema: genesisDPoSSchema,
	};
};
