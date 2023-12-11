/*
 * Copyright © 2023 Lisk Foundation
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
import { genesisInteroperabilitySchema } from 'lisk-framework';
import { MODULE_NAME_INTEROPERABILITY, CHAIN_NAME_MAINCHAIN } from '../constants';
import { GenesisAssetEntry, GenesisInteroperability } from '../types';

export const getInteropModuleEntry = async (): Promise<GenesisAssetEntry> => {
	const interopObj = ({
		ownChainName: CHAIN_NAME_MAINCHAIN,
		ownChainNonce: BigInt('0'),
		chainInfos: [],
		terminatedStateAccounts: [],
		terminatedOutboxAccounts: [],
	} as unknown) as GenesisInteroperability;

	return {
		module: MODULE_NAME_INTEROPERABILITY,
		data: (interopObj as unknown) as Record<string, unknown>,
		schema: genesisInteroperabilitySchema,
	};
};
