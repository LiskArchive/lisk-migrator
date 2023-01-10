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
import { genesisTokenStoreSchema } from '../schemas';

const AMOUNT_ZERO = BigInt('0');
const ADDRESS_LEGACY_RESERVE_HEX = ADDRESS_LEGACY_RESERVE.toString('hex');

export const getLockedBalances = async (account: Account): Promise<LockedBalance[]> => {
	let amount = AMOUNT_ZERO;
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
	TOKEN_ID_LSK: string,
): Promise<UserStoreEntry> => {
	const legacyReserveAccount: Account | undefined = accounts.find(account =>
		ADDRESS_LEGACY_RESERVE.equals(account.address),
	);

	let legacyReserveAmount = legacyReserveAccount ? legacyReserveAccount.token.balance : AMOUNT_ZERO;

	for (const account of legacyAccounts) {
		legacyReserveAmount += BigInt(account.balance);
	}
	const lockedBalances = legacyReserveAccount ? await getLockedBalances(legacyReserveAccount) : [];
	lockedBalances.push({
		module: MODULE_NAME_LEGACY,
		amount: String(legacyReserveAmount),
	});
	const legacyReserve = {
		address: ADDRESS_LEGACY_RESERVE_HEX,
		tokenID: TOKEN_ID_LSK,
		availableBalance: String(
			legacyReserveAccount ? legacyReserveAccount.token.balance : AMOUNT_ZERO,
		),
		lockedBalances,
	};

	return legacyReserve;
};

export const createUserSubstoreArray = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreData[],
	TOKEN_ID_LSK: string,
): Promise<UserStoreEntry[]> => {
	const userSubstore: UserStoreEntry[] = [];
	for (const account of accounts) {
		if (!ADDRESS_LEGACY_RESERVE.equals(account.address)) {
			const userObj = {
				address: account.address.toString('hex'),
				tokenID: TOKEN_ID_LSK,
				availableBalance: String(account.token.balance),
				lockedBalances: await getLockedBalances(account),
			};
			userSubstore.push(userObj);
		}
	}

	const legacyReserveAccount = await createLegacyReserveAccount(
		accounts,
		legacyAccounts,
		TOKEN_ID_LSK,
	);
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

		return bufferObjA.address.equals(bufferObjB.address)
			? bufferObjA.tokenID.compare(bufferObjB.tokenID)
			: bufferObjA.address.compare(bufferObjB.address);
	});

	return sortedUserSubstore.map(entry => ({
		...entry,
		address: getLisk32AddressFromAddress(Buffer.from(entry.address, 'hex')),
	}));
};

export const createSupplySubstoreArray = async (
	accounts: Account[],
	TOKEN_ID_LSK: string,
): Promise<SupplyStoreEntry[]> => {
	let totalLSKSupply = AMOUNT_ZERO;
	for (const account of accounts) {
		totalLSKSupply += BigInt(account.token.balance);
		const lockedBalances = await getLockedBalances(account);
		totalLSKSupply = lockedBalances.reduce(
			(accumulator, lockedBalance) => accumulator + BigInt(lockedBalance.amount),
			totalLSKSupply,
		);
	}

	const LSKSupply = { tokenID: TOKEN_ID_LSK, totalSupply: String(totalLSKSupply) };
	return [LSKSupply];
};

export const addTokenModuleEntry = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreData[],
	TOKEN_ID_LSK: string,
): Promise<GenesisAssetEntry> => {
	const tokenObj: TokenStoreEntry = {
		userSubstore: await createUserSubstoreArray(accounts, legacyAccounts, TOKEN_ID_LSK),
		supplySubstore: await createSupplySubstoreArray(accounts, TOKEN_ID_LSK),
		escrowSubstore: [],
		supportedTokensSubstore: [],
	};
	return {
		module: MODULE_NAME_TOKEN,
		data: tokenObj,
		schema: genesisTokenStoreSchema,
	};
};
