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
import { KVStore } from '@liskhq/lisk-db';

import {
	MODULE_NAME_LEGACY,
	DB_KEY_CHAIN_STATE,
	CHAIN_STATE_UNREGISTERED_ADDRESSES,
} from '../constants';
import { unregisteredAddressesSchema } from '../schemas';
import { UnregisteredAddresses } from '../types';

export class LegacyModuleAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public addLegacyModuleEntry = async (): Promise<any> => {
		const encodedUnregisteredAddresses = await this._db.get(
			`${DB_KEY_CHAIN_STATE}:${CHAIN_STATE_UNREGISTERED_ADDRESSES}`,
		);

		const { unregisteredAddresses } = await codec.decode<UnregisteredAddresses>(
			unregisteredAddressesSchema,
			encodedUnregisteredAddresses,
		);

		const legacyObject = { accounts: unregisteredAddresses };

		return {
			module: MODULE_NAME_LEGACY,
			data: legacyObject,
		};
	};
}
