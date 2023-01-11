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
	getBase32AddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { Block } from '@liskhq/lisk-chain';

import {
	MODULE_NAME_DPOS,
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	DPOS_INIT_ROUNDS,
	ROUND_LENGTH,
	Q96_ZERO,
	MAX_COMMISSION,
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
	ValidatorEntryBuffer,
} from '../types';
import { genesisDPoSSchema } from '../schemas';

export const getValidatorKeys = async (
	blocks: Block[],
	accounts: Account[],
): Promise<Record<string, string>> => {
	const keys: Record<string, string> = {};
	for (const block of blocks) {
		const lskAddress: string = getBase32AddressFromPublicKey(block.header.generatorPublicKey);
		keys[lskAddress] = block.header.generatorPublicKey.toString('hex');
		for (const trx of block.payload) {
			const trxSenderAddress: string = getBase32AddressFromPublicKey(trx.senderPublicKey);
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
	const validators: ValidatorEntryBuffer[] = [];
	const validatorKeys = await getValidatorKeys(blocks, accounts);

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
				pomHeights: account.dpos.delegate.pomHeights,
				consecutiveMissedBlocks: account.dpos.delegate.consecutiveMissedBlocks,
				lastCommissionIncreaseHeight: snapshotHeight,
				commission: MAX_COMMISSION,
				sharingCoefficients: {
					tokenID,
					coefficient: Q96_ZERO,
				},
			});
			validators.push(validator);
		}
	}

	return validators
		.sort((a, b) => a.address.compare(b.address))
		.map(entry => ({
			...entry,
			address: getLisk32AddressFromAddress(entry.address),
		}));
};

export const getSentVotes = async (account: Account, tokenID: string): Promise<SentVote[]> => {
	const sentVotes = account.dpos.sentVotes.map(vote => ({
		...vote,
		voteSharingCoefficients: [
			{
				tokenID,
				coefficient: Q96_ZERO,
			},
		],
	}));

	const sortedSentVotes = sentVotes
		.sort((a, b) => a.delegateAddress.compare(b.delegateAddress))
		.map(entry => ({
			...entry,
			delegateAddress: getLisk32AddressFromAddress(entry.delegateAddress),
		}));

	return sortedSentVotes;
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
	snapshotHeightPrevBlock: number,
): Promise<GenesisDataEntry> => {
	const r = Math.ceil((snapshotHeight - snapshotHeightPrevBlock) / ROUND_LENGTH);
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
	snapshotHeightPrevBlock: number,
	tokenID: string,
): Promise<GenesisAssetEntry> => {
	const dposObj = {
		validators: await createValidatorsArray(accounts, blocks, snapshotHeight, tokenID),
		voters: await createVotersArray(accounts, tokenID),
		genesisData: await createGenesisDataObj(
			accounts,
			delegatesVoteWeights,
			snapshotHeight,
			snapshotHeightPrevBlock,
		),
	};

	return {
		module: MODULE_NAME_DPOS,
		data: (dposObj as unknown) as Record<string, unknown>,
		schema: genesisDPoSSchema,
	};
};
