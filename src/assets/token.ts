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
	MODULE_NAME_TOKEN,
	MODULE_NAME_DPOS,
	ADDRESS_LEGACY_RESERVE,
	TOKEN_ID_LSK_MAINCHAIN,
	LOCAL_ID_LSK,
	RADIX_HEX,
	MODULE_NAME_LEGACY,
} from '../constants';

const nextLexicographicalOrder = (currentID: string) =>
	(parseInt((currentID as unknown) as string, RADIX_HEX) + 1).toString(RADIX_HEX);

export const getLockedBalances = async (account: any) => {
	let amount = 0;
	for (const vote of account.dpos.sentVotes) {
		amount += vote.amount;
	}

	for (const unlockingObj of account.dpos.unlocking) {
		amount += unlockingObj.amount;
	}

	if (amount > 0) {
		return [{ module: MODULE_NAME_DPOS, amount }];
	}
	return [];
};

export const createLegacyReserveAccount = async (accounts: any[], legacyAccounts: any[]) => {
	const legacyReserveAccount = accounts.find(account => account.address === ADDRESS_LEGACY_RESERVE);
	let legacyReserveAmount;
	const isEmpty = legacyReserveAmount === undefined;

	const legacyReserve: any = {};
	legacyReserve.address = ADDRESS_LEGACY_RESERVE;
	legacyReserve.tokenID = TOKEN_ID_LSK_MAINCHAIN;
	legacyReserve.availableBalance = isEmpty ? 0 : legacyReserveAccount.token.balance;
	legacyReserveAmount = 0;

	for (const account of legacyAccounts) {
		legacyReserveAmount += account.token.balance;
	}
	const lockedBalances: any[] = isEmpty ? [] : await getLockedBalances(legacyReserveAccount);
	legacyReserve.lockedBalances = lockedBalances.push({
		moduleID: MODULE_NAME_LEGACY,
		amount: legacyReserveAmount,
	});
	return legacyReserve;
};

export const createUserSubstoreArray = async (accounts: any[], legacyAccounts: []) => {
	const userSubstore: Object[] = [];
	for (const account of accounts) {
		if (account.address !== ADDRESS_LEGACY_RESERVE) {
			const userObj: any = {};
			userObj.address = account.address;
			userObj.tokenID = TOKEN_ID_LSK_MAINCHAIN;
			userObj.availableBalance = account.token.balance;
			userObj.lockedBalances = await getLockedBalances(account);
			userSubstore.push(userObj);
		}
	}

	const legacyReserveAccount: any = await createLegacyReserveAccount(accounts, legacyAccounts);
	userSubstore
		.concat(legacyReserveAccount)
		.sort((a: any, b: any) => a.address.concat(a.tokenID) - b.address.concat(b.tokenID));
	return userSubstore;
};

export const createSupplySubstoreArray = async (accounts: any[]) => {
	let totalLSKSupply = 0;
	for (const account of accounts) {
		totalLSKSupply += account.token.balance;
		const lockedBalances = await getLockedBalances(account);
		if (lockedBalances.length) {
			totalLSKSupply += lockedBalances[0].amount;
		}
	}
	const LSKSupply = { localID: LOCAL_ID_LSK, totalSupply: totalLSKSupply };
	return [LSKSupply];
};

export const addTokenModuleEntry = async (accounts: [], legacyAccounts: []) => {
	const tokenObj: any = {};
	tokenObj.userSubstore = await createUserSubstoreArray(accounts, legacyAccounts);
	tokenObj.supplySubstore = await createSupplySubstoreArray(accounts);
	tokenObj.escrowSubstore = [];
	tokenObj.availableLocalIDSubstore = {};
	tokenObj.availableLocalIDSubstore.nextAvailableLocalID = nextLexicographicalOrder(LOCAL_ID_LSK);

	return {
		module: MODULE_NAME_TOKEN,
		data: tokenObj,
	};
};
