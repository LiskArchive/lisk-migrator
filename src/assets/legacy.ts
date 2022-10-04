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
import { unregisteredAddressesSchema } from '../schemas';
import { UnregisteredAddresses, ModuleResponse } from '../types';

export const addLegacyModuleEntry = async (
	encodedUnregisteredAddresses: Buffer,
): Promise<ModuleResponse> => {
	const { unregisteredAddresses } = await codec.decode<UnregisteredAddresses>(
		unregisteredAddressesSchema,
		encodedUnregisteredAddresses,
	);

	const accounts = await Promise.all(
		unregisteredAddresses.map(async account => ({
			address: account.address.toString('hex'),
			balance: String(account.balance),
		})),
	);

	return {
		module: MODULE_NAME_LEGACY,
		data: { accounts },
	};
};
