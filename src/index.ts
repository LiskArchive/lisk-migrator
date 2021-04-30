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
import { join } from 'path';
import { Command, flags as flagsParser } from '@oclif/command';
import cli from 'cli-ux';
import { getConfig } from './utils/config';
import { observeChainHeight } from './utils/chain';
import { createDb, verifyConnection, createSnapshot } from './utils/storage';
import { createGenesisBlockFromStorage, writeGenesisBlock } from './utils/genesis_block';

const compatibleVersions = '>=2.1.4 <=2.1.6';

class LiskMigrator extends Command {
	public static description = 'Migrate Lisk Core to latest version';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),

		// Custom flags
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
				'The height at which re-genesis block will be generated. Can be specified with SNAPSHOT_HEIGHT as well.',
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

		const config = await getConfig(liskCorePath);

		cli.action.start('Verifying Lisk-Core version');
		const liskCoreVersion = semver.coerce(config.app.version);
		if (!liskCoreVersion) {
			this.error('Unable to detect the lisk-core version.');
		}
		if (!semver.satisfies(liskCoreVersion, compatibleVersions)) {
			this.error(
				`Lisk-Migrator utility is not compatible for lisk-core version ${liskCoreVersion.version}. Compatible versions range is: ${compatibleVersions}`,
			);
		}
		cli.action.stop(`${liskCoreVersion.version} detected`);

		const storageConfig = config.components.storage;

		cli.action.start(`Verifying connection to database "${storageConfig.database}"`);
		const db = createDb(storageConfig);
		await verifyConnection(db);
		cli.action.stop();

		await observeChainHeight({
			label: 'Waiting for snapshot height',
			db,
			height: snapshotHeight,
			delay: 500,
		});

		cli.action.start('Creating snapshot');
		const time = Date.now();
		await createSnapshot(db);
		cli.action.stop(`done in ${Date.now() - time}ms`);

		await observeChainHeight({
			label: 'Waiting for threshold height',
			db,
			height: snapshotHeight + waitThreshold,
			delay: 500,
		});

		const genesisBlock = await createGenesisBlockFromStorage({
			db,
			snapshotHeight,
			epochTime: config.app.genesisConfig.EPOCH_TIME,
		});

		cli.action.start('Exporting genesis block');
		writeGenesisBlock(genesisBlock, outputPath);
		cli.action.stop();
		this.log(outputPath);

		db.$pool.end();
	}
}

export = LiskMigrator;