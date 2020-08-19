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

import { join } from 'path';
import pgPromise, { QueryFile } from 'pg-promise';

import { StorageConfig } from '../types';

const pgp: pgPromise.IMain = pgPromise();

const sqlDir = join(__dirname, 'sql');

export const SQLs = {
	crateSnapshot: new QueryFile(join(sqlDir, 'create_snapshot.sql'), { minify: true }),
	getTopDelegates: new QueryFile(join(sqlDir, 'get_top_delegates.sql'), { minify: true }),
	getBlocks: new QueryFile(join(sqlDir, 'get_blocks.sql'), { minify: true }),
};

export const createDb = (config: StorageConfig): pgPromise.IDatabase<any> =>
	pgp({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		database: config.database,
	});

export const verifyConnection = async (db: pgPromise.IDatabase<any>): Promise<void> => {
	const connectionObject = await db.connect({ direct: true });
	connectionObject.done();
};
