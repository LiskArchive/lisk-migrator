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
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK,
	HEIGHT_SNAPSHOT,
	DPOS_INIT_ROUNDS,
	// ROUND_LENGTH,
} from '../constants';

export const getValidatorKeys = () => {
	const keys: any = [];
	for (const block of [HEIGHT_PREVIOUS_SNAPSHOT_BLOCK + 1, HEIGHT_SNAPSHOT] as any) {
		const lskAddress: any = address.getAddressFromPublicKey(block.generatorPublicKey);
		keys[lskAddress] = block.generatorPublicKey;
		for (const trs of block.transactions) {
			const trxAddress: any = address.getAddressFromPublicKey(trs.senderPublicKey);
			keys[trxAddress] = trs.senderPublicKey;
		}
	}
	return keys;
};

export const createValidatorsArray = (accounts: any[]) => {
	const validators: any[] = [];
	// Fix any type
	const validatorKeys: any = getValidatorKeys();

	for (const account of accounts) {
		if (account.dpos.delegate.username === '') {
			const validator: any = {};
			validator.address = account.address;
			validator.name = account.dpos.delegate.username;
			validator.blsKey = INVALID_BLS_KEY;
			validator.proofOfPossession = DUMMY_PROOF_OF_POSSESSION;
			if (validatorKeys[account.address]) {
				validator.generatorKey = validatorKeys[account.address];
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

export const createVotersArray = (accounts: any[]) => {
	const voters: any = [];
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
	const topDelegates: any = [];
	const initDelegates = topDelegates.map((delegate: any) => delegate.address);
	genesisDataObj.initDelegates = initDelegates;
	return genesisDataObj;
};

export const addDPoSModuleEntry = async (accounts: any) => {
	const DPoSObj: any = {};
	DPoSObj.validators = await createValidatorsArray(accounts);
	DPoSObj.voters = await createVotersArray(accounts);
	DPoSObj.snapshots = [];
	DPoSObj.genesisData = await createGenesisDataObj();

	return {
		module: MODULE_NAME_DPOS,
		data: DPoSObj,
	};
};
