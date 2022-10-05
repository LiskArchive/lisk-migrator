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
	MODULE_NAME_TOKEN,
	MODULE_NAME_DPOS,
	ADDRESS_LEGACY_RESERVE,
	TOKEN_ID_LSK_MAINCHAIN,
	LOCAL_ID_LSK,
	RADIX_HEX,
	MODULE_NAME_LEGACY,
	LOCAL_ID_LENGTH,
} from '../constants';

import {
	AccountEntry,
	LegacyAccountEntry,
	SupplySubstoreEntry,
	TokenStoreEntry,
	UserSubstoreEntry,
	ModuleResponse,
	LockedBalance,
} from '../types';

const nextLexicographicalOrder = (currentID: string) =>
	(parseInt(currentID, RADIX_HEX) + 1).toString(RADIX_HEX).padStart(LOCAL_ID_LENGTH, '0');

export const getLockedBalances = async (account: AccountEntry): Promise<LockedBalance[]> => {
	let amount = 0;
	for (const vote of account.dpos.sentVotes) {
		amount += Number(vote.amount);
	}

	for (const unlockingObj of account.dpos.unlocking) {
		amount += Number(unlockingObj.amount);
	}

	if (amount > 0) {
		return [{ module: MODULE_NAME_DPOS, amount: String(amount) }];
	}
	return [];
};

export const createLegacyReserveAccount = async (
	accounts: AccountEntry[],
	legacyAccounts: LegacyAccountEntry[],
): Promise<UserSubstoreEntry> => {
	const legacyReserveAccount: any = accounts.find(
		account => account.address === ADDRESS_LEGACY_RESERVE,
	);
	let legacyReserveAmount;
	const isEmpty = legacyReserveAmount === undefined;

	legacyReserveAmount = 0;

	for (const account of legacyAccounts) {
		legacyReserveAmount += Number(account.balance);
	}
	const lockedBalances = isEmpty ? [] : await getLockedBalances(legacyReserveAccount);
	lockedBalances.push({
		module: MODULE_NAME_LEGACY,
		amount: String(legacyReserveAmount),
	});
	const legacyReserve = {
		address: address.getLisk32AddressFromAddress(ADDRESS_LEGACY_RESERVE),
		tokenID: TOKEN_ID_LSK_MAINCHAIN,
		availableBalance: isEmpty ? 0 : legacyReserveAccount.token.balance,
		lockedBalances,
	};

	return legacyReserve;
};

export const createUserSubstoreArray = async (
	accounts: AccountEntry[],
	legacyAccounts: LegacyAccountEntry[],
): Promise<UserSubstoreEntry[]> => {
	const userSubstore: UserSubstoreEntry[] = [];
	for (const account of accounts) {
		if (account.address !== ADDRESS_LEGACY_RESERVE) {
			const userObj = {
				address: address.getLisk32AddressFromAddress(account.address),
				tokenID: TOKEN_ID_LSK_MAINCHAIN,
				availableBalance: String(account.token.balance),
				lockedBalances: await getLockedBalances(account),
			};
			userSubstore.push(userObj);
		}
	}

	const legacyReserveAccount = await createLegacyReserveAccount(accounts, legacyAccounts);
	userSubstore
		.concat(legacyReserveAccount)
		.sort((a: UserSubstoreEntry, b: UserSubstoreEntry) =>
			a.address.concat(a.tokenID).localeCompare(b.address.concat(b.tokenID)),
		);

	return userSubstore;
};

export const createSupplySubstoreArray = async (
	accounts: AccountEntry[],
): Promise<SupplySubstoreEntry[]> => {
	let totalLSKSupply = 0;
	for (const account of accounts) {
		totalLSKSupply += Number(account.token.balance);
		const lockedBalances = await getLockedBalances(account);
		if (lockedBalances.length) {
			totalLSKSupply += Number(lockedBalances[0].amount);
		}
	}
	const LSKSupply = { localID: LOCAL_ID_LSK, totalSupply: String(totalLSKSupply) };
	return [LSKSupply];
};

export const addTokenModuleEntry = async (
	accounts: AccountEntry[],
	legacyAccounts: LegacyAccountEntry[],
): Promise<ModuleResponse> => {
	const tokenObj: TokenStoreEntry = {
		userSubstore: await createUserSubstoreArray(accounts, legacyAccounts),
		supplySubstore: await createSupplySubstoreArray(accounts),
		escrowSubstore: [],
		availableLocalIDSubstore: {
			nextAvailableLocalID: nextLexicographicalOrder(LOCAL_ID_LSK),
		},
	};
	return {
		module: MODULE_NAME_TOKEN,
		data: tokenObj,
	};
};
