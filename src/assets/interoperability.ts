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
import { MODULE_NAME_INTEROPERABILITY, CHAIN_NAME_MAINCHAIN, EMPTY_BYTES } from '../constants';
import { genesisInteroperabilitySchema } from '../schemas';
import { GenesisAssetEntry, GenesisInteroperability } from '../types';

export const addInteropModuleEntry = async (tokenID: string): Promise<GenesisAssetEntry> => {
	const chainID = tokenID.slice(0, 8);
	const chainIDBuffer = Buffer.from(chainID, 'hex');

	const interopObj: GenesisInteroperability = {
		outboxRootSubstore: [],
		chainDataSubstore: [],
		channelDataSubstore: [],
		chainValidatorsSubstore: [],
		ownChainDataSubstore: [],
		terminatedStateSubstore: [],
		terminatedOutboxSubstore: [],
		registeredNamesSubstore: [],
	};

	const ownChainAccount = {
		name: CHAIN_NAME_MAINCHAIN,
		chainID: chainIDBuffer,
		nonce: BigInt('0'),
	};

	interopObj.ownChainDataSubstore = [
		{
			storeKey: EMPTY_BYTES,
			storeValue: ownChainAccount,
		},
	];

	const registeredNamesStore = { chainID: chainIDBuffer };

	interopObj.registeredNamesSubstore.push({
		storeKey: Buffer.from(CHAIN_NAME_MAINCHAIN, 'utf-8'),
		storeValue: registeredNamesStore,
	});

	return {
		module: MODULE_NAME_INTEROPERABILITY,
		data: (interopObj as unknown) as Record<string, unknown>,
		schema: genesisInteroperabilitySchema,
	};
};
