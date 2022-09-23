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

import { DB_KEY_ACCOUNTS_ADDRESS, MODULE_NAME_AUTH } from '../constants';

import { accountSchema } from '../schemas';

export class AuthModuleAsset {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public addAuthModuleEntry = async (): Promise<any> => {
		const accountStream = await this._db.createReadStream({
			gte: `${DB_KEY_ACCOUNTS_ADDRESS}:${Buffer.alloc(0, 20).toString('binary')}`,
		});

		const allAccounts = await new Promise<any>((resolve, reject) => {
			const accounts: any = [];
			accountStream
				.on('data', async ({ value }) => {
					accounts.push(value.toString('hex'));
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(accounts);
				});
		});

		const authDataSubstore: any[] = [];

		await Promise.all(
			allAccounts.map(async (account: Buffer) => {
				const authObj: any = {};
				const decodedAccount = await codec.decode<any>(accountSchema, account);
				authObj.numberOfSignatures = decodedAccount.keys.numberOfSignatures;
				authObj.mandatoryKeys = decodedAccount.keys.mandatoryKeys.sort();
				authObj.optionalKeys = decodedAccount.keys.optionalKeys.sort();
				authObj.nonce = decodedAccount.sequence.nonce;
				authDataSubstore.push({
					address: decodedAccount.address,
					authAccount: authObj,
				});
				return decodedAccount;
			}),
		);

		return {
			module: MODULE_NAME_AUTH,
			data: { authDataSubstore },
		};
	};
}
