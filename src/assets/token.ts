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

import {
	MODULE_NAME_POS,
	MODULE_NAME_LEGACY,
	ADDRESS_LEGACY_RESERVE,
	MODULE_NAME_TOKEN,
} from '../constants';

import {
	Account,
	GenesisAssetEntry,
	LockedBalance,
	SupplySubstoreEntry,
	TokenStoreEntry,
	UserSubstoreEntry,
	UserSubstoreEntryBuffer,
} from '../types';

const AMOUNT_ZERO = BigInt('0');

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
	legacyReserveAccount: Account | undefined,
	legacyReserveAmount: bigint,
	tokenID: string,
): Promise<UserSubstoreEntryBuffer> => {
	const tokenIDBuffer = Buffer.from(tokenID, 'hex');

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

export const createUserSubstoreArrayEntry = async (
	account: Account,
	tokenID: string,
): Promise<UserSubstoreEntryBuffer | null> => {
	const tokenIDBuffer = Buffer.from(tokenID, 'hex');

	if (!ADDRESS_LEGACY_RESERVE.equals(account.address)) {
		const lockedBalances = await getLockedBalances(account);
		if (account.token.balance !== AMOUNT_ZERO || lockedBalances.length) {
			return {
				address: account.address,
				tokenID: tokenIDBuffer,
				availableBalance: String(account.token.balance),
				lockedBalances,
			};
		}
	}
	return null;
};

export const addTokenModuleEntry = async (
	userSubstore: UserSubstoreEntry[],
	supplySubstore: SupplySubstoreEntry[],
	escrowSubstore: never[],
	supportedTokensSubstore: never[],
): Promise<GenesisAssetEntry> => {
	const tokenObj: TokenStoreEntry = {
		userSubstore,
		supplySubstore,
		escrowSubstore,
		supportedTokensSubstore,
	};
	return {
		module: MODULE_NAME_TOKEN,
		data: (tokenObj as unknown) as Record<string, unknown>,
		schema: tokenGenesisStoreSchema,
	};
};
