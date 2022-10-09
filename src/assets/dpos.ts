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
import {
	MODULE_NAME_DPOS,
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	DPOS_INIT_ROUNDS,
	// ROUND_LENGTH,
} from '../constants';

import {
	Account,
	BlockEntry,
	GenesisAssetEntry,
	ValidatorEntry,
	Voter,
	GenesisDataEntry,
} from '../types';

export const getValidatorKeys = async (blocks: BlockEntry[]): Promise<Record<string, string>> => {
	const keys: Record<string, string> = {};
	for (const block of blocks) {
		const lskAddress: string = getLisk32AddressFromPublicKey(block.header.generatorPublicKey);
		keys[lskAddress] = block.header.generatorPublicKey.toString('hex');
		for (const trx of block.payload) {
			const trxAddress: string = getLisk32AddressFromPublicKey(trx.senderPublicKey);
			keys[trxAddress] = trx.senderPublicKey.toString('hex');
		}
	}
	return keys;
};

export const createValidatorsArray = async (
	accounts: Account[],
	blocks: BlockEntry[],
): Promise<ValidatorEntry[]> => {
	const validators: ValidatorEntry[] = [];
	const validatorKeys = await getValidatorKeys(blocks);

	for (const account of accounts) {
		if (account.dpos.delegate.username !== '') {
			const validatorAddress = getLisk32AddressFromAddress(account.address);
			const validator: ValidatorEntry = {
				address: validatorAddress,
				name: account.dpos.delegate.username,
				blsKey: INVALID_BLS_KEY,
				proofOfPossession: DUMMY_PROOF_OF_POSSESSION,
				generatorKey: '',
				lastGeneratedHeight: 0,
				isBanned: false,
				pomHeights: [],
				consecutiveMissedBlocks: 0,
			};
			if (validatorKeys[validatorAddress]) {
				validator.generatorKey = validatorKeys[validatorAddress];
			} else {
				validator.generatorKey = INVALID_ED25519_KEY;
			}
			validator.lastGeneratedHeight = account.dpos.delegate.lastForgedHeight;
			validator.isBanned = account.dpos.delegate.isBanned;
			validator.pomHeights = account.dpos.delegate.pomHeights;
			validator.consecutiveMissedBlocks = account.dpos.delegate.consecutiveMissedBlocks;
			validators.push(validator);
		}
	}
	return validators;
};

export const createVotersArray = async (accounts: Account[]): Promise<Voter[]> => {
	const voters: Voter[] = [];
	for (const account of accounts) {
		if (account.dpos.sentVotes.length && account.dpos.unlocking.length) {
			const voter: Voter = {
				address: getLisk32AddressFromAddress(account.address),
				sentVotes: account.dpos.sentVotes.map(vote => ({
					delegateAddress: getLisk32AddressFromAddress(vote.delegateAddress),
					amount: String(vote.amount),
				})),
				pendingUnlocks: account.dpos.unlocking.map(unlock => ({
					delegateAddress: getLisk32AddressFromAddress(unlock.delegateAddress),
					amount: String(unlock.amount),
					unvoteHeight: unlock.unvoteHeight,
				})),
			};
			voters.push(voter);
		}
	}
	return voters;
};

export const createGenesisDataObj = async (): Promise<GenesisDataEntry> => {
	// const r = Math.ceil((snapshotHeight - HEIGHT_PREVIOUS_SNAPSHOT_BLOCK) / ROUND_LENGTH);
	// TODO: Discuss and update the logic to resolve top delegates
	const topDelegates: any = [];
	const initDelegates = topDelegates.map((delegate: any) =>
		getLisk32AddressFromAddress(delegate.address),
	);
	const genesisDataObj: GenesisDataEntry = {
		initRounds: DPOS_INIT_ROUNDS,
		initDelegates,
	};
	return genesisDataObj;
};

export const addDPoSModuleEntry = async (
	accounts: Account[],
	blocks: BlockEntry[],
): Promise<GenesisAssetEntry> => {
	const dposObj = {
		validators: await createValidatorsArray(accounts, blocks),
		voters: await createVotersArray(accounts),
		snapshots: [],
		genesisData: await createGenesisDataObj(),
	};

	return {
		module: MODULE_NAME_DPOS,
		data: dposObj,
	};
};
