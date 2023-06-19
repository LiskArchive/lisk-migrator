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
import { codec } from '@liskhq/lisk-codec';

import { MODULE_NAME_LEGACY } from '../constants';
import { genesisLegacyStoreSchema, unregisteredAddressesSchema } from '../schemas';
import {
	UnregisteredAddresses,
	GenesisAssetEntry,
	LegacyStoreEntry,
	LegacyStoreEntryBuffer,
	Account,
} from '../types';

const AMOUNT_ZERO = BigInt('0');
let legacyReserveAmount: bigint = AMOUNT_ZERO;

export const getLegacyModuleEntry = async (
	encodedUnregisteredAddresses: Buffer,
	legacyReserveAccount: Account | undefined,
): Promise<GenesisAssetEntry> => {
	legacyReserveAmount = legacyReserveAccount ? legacyReserveAccount.token.balance : AMOUNT_ZERO;

	const { unregisteredAddresses } = await codec.decode<UnregisteredAddresses>(
		unregisteredAddressesSchema,
		encodedUnregisteredAddresses,
	);

	const legacyAccounts: LegacyStoreEntryBuffer[] = unregisteredAddresses.map(account => {
		legacyReserveAmount += BigInt(account.balance);

		return {
			address: account.address,
			balance: String(account.balance),
		};
	});

	const sortedLegacyAccounts: LegacyStoreEntry[] = legacyAccounts
		.sort((a, b) => a.address.compare(b.address))
		.map(entry => ({
			...entry,
			address: entry.address.toString('hex'),
		}));

	return {
		module: MODULE_NAME_LEGACY,
		data: ({ accounts: sortedLegacyAccounts } as unknown) as Record<string, unknown>,
		schema: genesisLegacyStoreSchema,
	};
};

export const getLegacyReserveAmount = () => legacyReserveAmount;
