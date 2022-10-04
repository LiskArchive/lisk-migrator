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

import { address } from '@liskhq/lisk-cryptography';
import {
	MODULE_NAME_DPOS,
	INVALID_BLS_KEY,
	DUMMY_PROOF_OF_POSSESSION,
	INVALID_ED25519_KEY,
	DPOS_INIT_ROUNDS,
	// ROUND_LENGTH,
} from '../constants';

import { Account, Block, Validator, Voter } from '../types';

export const getValidatorKeys = (blocks: Block[]) => {
	const keys = [];
	for (const block of blocks) {
		const lskAddress: any = address.getAddressFromPublicKey(block.header.generatorPublicKey);
		keys[lskAddress] = block.header.generatorPublicKey;
		for (const trs of block.payload) {
			const trxAddress: any = address.getAddressFromPublicKey(trs.senderPublicKey).toString('hex');
			keys[trxAddress] = trs.senderPublicKey.toString('hex');
		}
	}
	return keys;
};

export const createValidatorsArray = (accounts: Account[], blocks: Block[]) => {
	const validators: Validator[] = [];
	const validatorKeys: any = getValidatorKeys(blocks);

	for (const account of accounts) {
		if (account.dpos.delegate.username === '') {
			const validator: any = {};
			validator.address = account.address.toString('hex');
			validator.name = account.dpos.delegate.username;
			validator.blsKey = INVALID_BLS_KEY;
			validator.proofOfPossession = DUMMY_PROOF_OF_POSSESSION;
			if (validatorKeys[account.address.toString('hex')]) {
				validator.generatorKey = validatorKeys[account.address.toString('hex')];
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

export const createVotersArray = (accounts: Account[]) => {
	const voters: Voter[] = [];
	for (const account of accounts) {
		if (account.dpos.sentVotes && account.dpos.unlocking) {
			const voter: any = {};
			voter.address = account.address;
			voter.sentVotes = account.dpos.sentVotes;
			voter.pendingUnlocks = account.dpos.unlocking;
			voters.push(voter);
		}
	}
	return voters;
};

export const createGenesisDataObj = () => {
	const genesisDataObj: any = {};
	genesisDataObj.initRounds = DPOS_INIT_ROUNDS;
	// const r = Math.ceil((HEIGHT_SNAPSHOT - HEIGHT_PREVIOUS_SNAPSHOT_BLOCK) / ROUND_LENGTH);
	// TODO: Discuss
	const topDelegates: any = [];
	const initDelegates = topDelegates.map((delegate: any) => delegate.address);
	genesisDataObj.initDelegates = initDelegates;
	return genesisDataObj;
};

export const addDPoSModuleEntry = async (accounts: Account[], blocks: any) => {
	const DPoSObj: any = {};
	DPoSObj.validators = await createValidatorsArray(accounts, blocks);
	DPoSObj.voters = await createVotersArray(accounts);
	DPoSObj.snapshots = [];
	DPoSObj.genesisData = await createGenesisDataObj();

	return {
		module: MODULE_NAME_DPOS,
		data: DPoSObj,
	};
};
