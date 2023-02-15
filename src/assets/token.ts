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
import { tokenGenesisStoreSchema } from 'lisk-framework';
import { getLisk32AddressFromAddress } from '@liskhq/lisk-cryptography';

import {
	MODULE_NAME_TOKEN,
	MODULE_NAME_POS,
	MODULE_NAME_LEGACY,
	ADDRESS_LEGACY_RESERVE,
} from '../constants';

import {
	Account,
	LockedBalance,
	GenesisAssetEntry,
	TokenStoreEntry,
	LegacyStoreEntry,
	SupplySubstoreEntry,
	UserSubstoreEntry,
	UserSubstoreEntryBuffer,
} from '../types';

const AMOUNT_ZERO = BigInt('0');
let legacyReserveAmount: bigint = AMOUNT_ZERO;

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

	if (amount > AMOUNT_ZERO) {
		return [{ module: MODULE_NAME_POS, amount: String(amount) }];
	}
	return [];
};

export const createLegacyReserveAccount = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreEntry[],
	tokenID: string,
): Promise<UserSubstoreEntryBuffer> => {
	const tokenIDBuffer = Buffer.from(tokenID, 'hex');

	const legacyReserveAccount: Account | undefined = accounts.find(account =>
		ADDRESS_LEGACY_RESERVE.equals(account.address),
	);

	legacyReserveAmount = legacyReserveAccount ? legacyReserveAccount.token.balance : AMOUNT_ZERO;

	for (const account of legacyAccounts) {
		legacyReserveAmount += BigInt(account.balance);
	}
	const lockedBalances = legacyReserveAccount ? await getLockedBalances(legacyReserveAccount) : [];
	lockedBalances.push({
		module: MODULE_NAME_LEGACY,
		amount: String(legacyReserveAmount),
	});
	lockedBalances.sort((a, b) => a.module.localeCompare(b.module, 'en'));
	const legacyReserve = {
		address: ADDRESS_LEGACY_RESERVE,
		tokenID: tokenIDBuffer,
		availableBalance: String(
			legacyReserveAccount ? legacyReserveAccount.token.balance : AMOUNT_ZERO,
		),
		lockedBalances,
	};

	return legacyReserve;
};

export const createUserSubstoreArray = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreEntry[],
	tokenID: string,
): Promise<UserSubstoreEntry[]> => {
	const userSubstore: UserSubstoreEntryBuffer[] = [];
	const tokenIDBuffer = Buffer.from(tokenID, 'hex');

	for (const account of accounts) {
		if (!ADDRESS_LEGACY_RESERVE.equals(account.address)) {
			const userObj = {
				address: account.address,
				tokenID: tokenIDBuffer,
				availableBalance: String(account.token.balance),
				lockedBalances: await getLockedBalances(account),
			};
			userSubstore.push(userObj);
		}
	}

	const legacyReserveAccount = await createLegacyReserveAccount(accounts, legacyAccounts, tokenID);
	userSubstore.push(legacyReserveAccount);

	const sortedUserSubstore = userSubstore.sort(
		(a: UserSubstoreEntryBuffer, b: UserSubstoreEntryBuffer) =>
			a.address.equals(b.address) ? a.tokenID.compare(b.tokenID) : a.address.compare(b.address),
	);

	return sortedUserSubstore.map(entry => ({
		...entry,
		address: getLisk32AddressFromAddress(entry.address),
		tokenID: entry.tokenID.toString('hex'),
	}));
};

export const createSupplySubstoreArray = async (
	accounts: Account[],
	tokenID: string,
): Promise<SupplySubstoreEntry[]> => {
	let totalLSKSupply = AMOUNT_ZERO;
	for (const account of accounts) {
		totalLSKSupply += BigInt(account.token.balance);
		const lockedBalances = await getLockedBalances(account);
		totalLSKSupply = lockedBalances.reduce(
			(accumulator, lockedBalance) => accumulator + BigInt(lockedBalance.amount),
			totalLSKSupply,
		);
	}

	const LSKSupply: SupplySubstoreEntry = {
		tokenID,
		totalSupply: String(totalLSKSupply + legacyReserveAmount),
	};

	return [LSKSupply];
};

export const addTokenModuleEntry = async (
	accounts: Account[],
	legacyAccounts: LegacyStoreEntry[],
	tokenID: string,
): Promise<GenesisAssetEntry> => {
	const tokenObj: TokenStoreEntry = {
		userSubstore: await createUserSubstoreArray(accounts, legacyAccounts, tokenID),
		// TODO: Update implementation once LIP-0063 is updated
		supplySubstore: await createSupplySubstoreArray(accounts, tokenID),
		escrowSubstore: [],
		supportedTokensSubstore: [],
	};
	return {
		module: MODULE_NAME_TOKEN,
		data: (tokenObj as unknown) as Record<string, unknown>,
		schema: tokenGenesisStoreSchema,
	};
};
