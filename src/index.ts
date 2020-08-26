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

import * as semver from 'semver';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Command, flags as flagsParser } from '@oclif/command';
import { getConfig } from './utils/config';
// import { observeChainHeight } from './utils/chain';
import { createDb, verifyConnection, SQLs } from './utils/storage';
import { createGenesisBlockFromStorage } from './utils/genesis_block';

const copmpatibleVersions = '>=2.1.4 <=2.1.6';

class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),

		// Cutom flags
		output: flagsParser.string({
			char: 'o',
			required: false,
			description:
				'File path to write the genesis block json. If not provided, it will default to cwd/genesis_block.json.',
		}),
		'lisk-core-path': flagsParser.string({
			char: 'p',
			required: false,
			description:
				'Path where the lisk-core instance is running. Current directory will be considered the default if not provided.',
		}),
		'snapshot-height': flagsParser.integer({
			char: 's',
			required: true,
			env: 'SNAPSHOT_HEIGHT',
			description:
				'he height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.',
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
		const outputPath = flags.output ?? join(process.cwd(), 'genesis_block.json');
		const snapshotHeight = flags['snapshot-height'];
		const waitThreshold = process.env.NODE_ENV === 'test' ? flags['wait-threshold'] : 201;

		this.log('Loading up configuration from path: ', liskCorePath);
		const config = await getConfig(liskCorePath);

		this.log('\n');
		this.log('Verifying Lisk-Core verison...');
		const liskCoreVersion = semver.coerce(config.app.version);
		if (!liskCoreVersion) {
			this.error('Unable to detect the lisk-core version.');
		}
		if (!semver.satisfies(liskCoreVersion, copmpatibleVersions)) {
			this.error(
				`Lisk-Migrator utility is not compatiable for lisk-core version ${liskCoreVersion.version}. Compatible versions range is: ${copmpatibleVersions}`,
			);
		}
		this.log(`Lisk-Core version ${liskCoreVersion.version} detected`);

		this.log('\n');
		this.log('Verifying database connection...');
		const storageConfig = config.components.storage;
		const db = createDb({ ...storageConfig, database: 'lisk_main' });
		await verifyConnection(db);
		this.log('Verified database connection');

		this.log('\n');
		this.log('Connecting Lisk Core database...');
		this.log(`Waiting for snapshot height: ${snapshotHeight}`);
		// await observeChainHeight({
		// 	db,
		// 	height: snapshotHeight,
		// 	delay: 500,
		// });
		this.log('\n');

		this.log(`Taking snapshot on height: ${snapshotHeight}`);
		const time = Date.now();
		await db.query(SQLs.crateSnapshot);
		this.log(`Snapshot took ${Date.now() - time}ms`);

		this.log('\n');
		this.log(`Waiting for threshold height: ${snapshotHeight + waitThreshold}`);
		// await observeChainHeight({
		// 	db,
		// 	height: snapshotHeight + waitThreshold,
		// 	delay: 500,
		// });

		this.log('\n');
		this.log('Creating genesis block');
		const genesisBlock = await createGenesisBlockFromStorage({
			db,
			snapshotHeight,
			blockTime: config.app.genesisConfig.BLOCK_TIME,
			epochTime: config.app.genesisConfig.EPOCH_TIME,
		});

		this.log('\n');
		this.log('Exporting genesis block');
		writeFileSync(outputPath, JSON.stringify(genesisBlock, null, '\t'));
		this.log(outputPath);

		db.$pool.end();
	}
}

export = LiskMigrator;
