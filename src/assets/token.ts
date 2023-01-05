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
import { getLisk32AddressFromAddress } from '@liskhq/lisk-cryptography';

import {
	MODULE_NAME_TOKEN,
	MODULE_NAME_DPOS,
	ADDRESS_LEGACY_RESERVE,
	TOKEN_ID_LSK,
	MODULE_NAME_LEGACY,
} from '../constants';

import {
	Account,
	LegacyStoreData,
	SupplyStoreEntry,
	TokenStoreEntry,
	UserStoreEntry,
	GenesisAssetEntry,
	LockedBalance,
} from '../types';

export const getLockedBalances = async (account: Account): Promise<LockedBalance[]> => {
	let amount = BigInt('0');
	if (account) {
		for (const vote of account.dpos.sentVotes) {
			amount += BigInt(vote.amount);
		}

		for (const unlockingObj of account.dpos.unlocking) {
			amount += BigInt(unlockingObj.amount);
		}
	}

	if (amount > 0) {
		return [{ module: MODULE_NAME_DPOS, amount: String(amount) }];
	}
	return [];
};

export const createLegacyReserveAccount = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreData[],
): Promise<UserStoreEntry> => {
	const AMOUNT_ZERO = BigInt('0');

	const [legacyReserveAccount] = accounts.filter(
		account => account.address.toString('hex') === ADDRESS_LEGACY_RESERVE.toString('hex'),
	);
	let legacyReserveAmount = legacyReserveAccount?.token.balance || AMOUNT_ZERO;

	for (const account of legacyAccounts) {
		legacyReserveAmount += BigInt(account.balance);
	}
	const lockedBalances = await getLockedBalances(legacyReserveAccount);
	lockedBalances.push({
		module: MODULE_NAME_LEGACY,
		amount: String(legacyReserveAmount),
	});
	const legacyReserve = {
		address: ADDRESS_LEGACY_RESERVE.toString('hex'),
		tokenID: TOKEN_ID_LSK,
		availableBalance: (legacyReserveAccount?.token.balance || AMOUNT_ZERO).toString(),
		lockedBalances,
	};

	return legacyReserve;
};

export const createUserSubstoreArray = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreData[],
): Promise<UserStoreEntry[]> => {
	const userSubstore: UserStoreEntry[] = [];
	for (const account of accounts) {
		if (account.address !== ADDRESS_LEGACY_RESERVE) {
			const userObj = {
				address: account.address.toString('hex'),
				tokenID: TOKEN_ID_LSK,
				availableBalance: String(account.token.balance),
				lockedBalances: await getLockedBalances(account),
			};
			userSubstore.push(userObj);
		}
	}

	const legacyReserveAccount = await createLegacyReserveAccount(accounts, legacyAccounts);
	userSubstore.push(legacyReserveAccount);

	const sortedUserSubstore = userSubstore.sort((a: UserStoreEntry, b: UserStoreEntry) => {
		const bufferObjA = {
			address: Buffer.from(a.address, 'hex'),
			tokenID: Buffer.from(a.tokenID, 'hex'),
		};
		const bufferObjB = {
			address: Buffer.from(b.address, 'hex'),
			tokenID: Buffer.from(b.tokenID, 'hex'),
		};
		if (!bufferObjA.address.equals(bufferObjB.address)) {
			return bufferObjA.address.compare(bufferObjB.address);
		}
		return bufferObjA.tokenID.compare(bufferObjB.tokenID);
	});

	return sortedUserSubstore.map(entry => ({
		...entry,
		address: getLisk32AddressFromAddress(Buffer.from(entry.address, 'hex')),
		tokenID: entry.tokenID,
	}));
};

export const createSupplySubstoreArray = async (
	accounts: Account[],
): Promise<SupplyStoreEntry[]> => {
	let totalLSKSupply = BigInt('0');
	for (const account of accounts) {
		totalLSKSupply += account.token.balance;
		const lockedBalances = await getLockedBalances(account);
		if (lockedBalances.length) {
			totalLSKSupply += BigInt(lockedBalances[0].amount);
		}
	}
	const LSKSupply = { tokenID: TOKEN_ID_LSK, totalSupply: String(totalLSKSupply) };
	return [LSKSupply];
};

export const addTokenModuleEntry = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreData[],
): Promise<GenesisAssetEntry> => {
	const tokenObj: TokenStoreEntry = {
		userSubstore: await createUserSubstoreArray(accounts, legacyAccounts),
		supplySubstore: await createSupplySubstoreArray(accounts),
		escrowSubstore: [],
		supportedTokensSubstore: [],
	};
	return {
		module: MODULE_NAME_TOKEN,
		data: tokenObj,
	};
};
