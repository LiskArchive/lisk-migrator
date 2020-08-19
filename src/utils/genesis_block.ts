/*
 * Copyright © 2020 Lisk Foundation
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

import pgPromise from 'pg-promise';
// import { createGenesisBlock } from 'lisk-genesis';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { SQLs } from './storage';

export const createGenesisBlockFromStorage = async (
	db: pgPromise.IDatabase<any>,
	snapshotHeight: number,
): Promise<void> => {
	const topDelegates = (await db.many(SQLs.getTopDelegates)).map(obj =>
		getAddressFromPublicKey(obj.publicKey),
	);

	console.info(topDelegates);
};
