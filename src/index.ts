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

import { Command, flags as flagsParser } from '@oclif/command';
import { getConfig } from './utils/config';
// import { observeChainHeight } from './utils/network';
import { createDb, verifyConnection, SQLs } from './utils/storage';
import { createGenesisBlockFromStorage } from './utils/genesis_block';

class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help(),

		// Cutom flags
		output: flagsParser.string({
			char: 'o',
			required: false,
			description:
				'Path to write the genesis block. Current directory will be considred defautl if not porvided.',
		}),
		'lisk-core-path': flagsParser.string({
			char: 'p',
			required: false,
			description:
				'Path where Lisk-Core instnace is running. Current directory will be considred defautl if not porvided.',
		}),
		'snapshot-height': flagsParser.integer({
			char: 'h',
			required: true,
			env: 'SNAPSHOT_HEIGHT',
			description:
				'The height at which re-genesis block will be associated. Can be specified with SNAPSHOT_HEIGHT as well.',
		}),
		'wait-threshold': flagsParser.integer({
			char: 'w',
			required: true,
			env: 'SNAPSHOT_WAIT_THRESHOLD',
			description:
				'Blocks to wait before creating a snapshot. Applies only if NODE_ENV=test otherwise 201 value be used.',
			default: 201,
		}),
	};

	public async run(): Promise<void> {
		const { flags } = this.parse(LiskMigrator);
		const liskCorePath = flags['lisk-core-path'] ?? process.cwd();
		// const outputPath = flags.output ?? process.cwd();
		const snapshotHeight = flags['snapshot-height'];
		const waitThreshold = process.env.NODE_ENV === 'test' ? flags['wait-threshold'] : 201;

		this.log('Loading up configuration from path: ', liskCorePath);
		const config = await getConfig(liskCorePath);

		this.log('\n');
		this.log('Verifying database connection...');
		const storageConfig = config.components.storage;
		const db = createDb(storageConfig);
		await verifyConnection(db);
		this.log('Verified database connection');

		const { httpPort, address: httpAddress } = config.modules.http_api;
		this.log('\n');
		this.log(`Connecting Lisk Core on ${httpAddress as string}:${httpPort as number}`);
		this.log(`Waiting for snapshot height: ${snapshotHeight}`);
		// await observeChainHeight({ address: httpAddress, port: httpPort, height: snapshotHeight, delay: 500 });
		this.log('\n');

		this.log(`Taking snapshot on height: ${snapshotHeight}`);
		const time = Date.now();
		await db.query(SQLs.crateSnapshot);
		this.log(`Snapshot took ${Date.now() - time}ms`);

		this.log('\n');
		this.log(`Waiting for threshold height: ${snapshotHeight + waitThreshold}`);
		// await observeChainHeight({ address: httpAddress, port: httpPort, height: snapshotHeight + waitThreshold, delay: 500 });

		this.log('\n');
		this.log('Creating genesis block');
		await createGenesisBlockFromStorage(db, snapshotHeight);

		db.$pool.end();
	}
}

export = LiskMigrator;
