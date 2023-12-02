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
import * as fs from 'fs-extra';
import { resolve, join } from 'path';
import { ApplicationConfig } from 'lisk-framework';
import Command from '@oclif/command';
import { log, error } from 'console';

import { configV3, configV4 } from '../fixtures/config';
import { NETWORK_CONSTANT } from '../../../src/constants';
import {
	getNetworkByNetworkID,
	getLogLevel,
	migrateUserConfig,
	validateConfig,
	writeConfig,
	resolveConfigPathByNetworkID,
	createBackup,
	getConfig,
} from '../../../src/utils/config';
import { ApplicationConfigV3, LoggerConfig } from '../../../src/types';

const migratedConfigFilePath = join(__dirname, 'test/config');
const expectedBackupPath = join(__dirname, '../../..', 'backup');

const mockCommand = {
	log,
	error,
};

describe('Test getLogLevel method', () => {
	it('should return highest priority logLevel provided by user', async () => {
		const loggerConfig = {
			fileLogLevel: 'trace',
			consoleLogLevel: 'error',
		} as LoggerConfig;
		const logLevel = getLogLevel(loggerConfig);
		expect(logLevel).toBe('trace');
	});

	it('should return info when logger config is not available', async () => {
		const loggerConfig = {} as LoggerConfig;
		const logLevel = getLogLevel(loggerConfig);
		expect(logLevel).toBe('info');
	});

	it('should return the highest priority log level when one of the specified logLevel is incorrect', async () => {
		const loggerConfig = {
			fileLogLevel: 'trace',
			consoleLogLevel: 'err',
		} as LoggerConfig;
		const logLevel = getLogLevel(loggerConfig);
		expect(logLevel).toBe('trace');
	});

	it('should return info if the specified valid log level is of lower priority than info and other is incorrect', async () => {
		const loggerConfig = {
			fileLogLevel: 'fatal',
			consoleLogLevel: 'err',
		} as LoggerConfig;
		const logLevel = getLogLevel(loggerConfig);
		expect(logLevel).toBe('info');
	});
});

describe('Migrate user configuration', () => {
	afterAll(() => {
		fs.removeSync(migratedConfigFilePath);
		fs.removeSync(expectedBackupPath);
	});

	it('should migrate user configuration', async () => {
		const snapshotHeight = 10815;
		const config = ((await migrateUserConfig(
			(configV3 as unknown) as ApplicationConfigV3,
			(configV4 as unknown) as ApplicationConfig,
			snapshotHeight as number,
		)) as unknown) as ApplicationConfig;
		expect(Object.getOwnPropertyNames(config).length).toBeGreaterThan(0);

		const isValidConfig = await validateConfig(config);
		expect(isValidConfig).toBe(true);

		await writeConfig(config, migratedConfigFilePath);
		expect(fs.existsSync(migratedConfigFilePath)).toBe(true);
		expect(fs.existsSync(`${migratedConfigFilePath}/config.json`)).toBe(true);
	});

	it('should return false when user configuration is invalid', async () => {
		const isValidConfig = await validateConfig(({
			invalid: 'invalid',
		} as unknown) as ApplicationConfig);
		expect(isValidConfig).toBe(false);
	});
});

describe('Test networkIdentifier method', () => {
	it('should determine network correctly by networkIdentifier', async () => {
		Object.keys(NETWORK_CONSTANT).forEach(networkID => {
			const network = getNetworkByNetworkID(networkID);
			expect(network).toBe(NETWORK_CONSTANT[networkID].name);
		});
	});

	it('should throw error with unknown networkIdentifier', async () => {
		expect(() => getNetworkByNetworkID('unknown network identifier')).toThrow(
			'Migrator running against unidentified network. Cannot proceed.',
		);
	});
});

describe('Test resolveConfigPathByNetworkID method', () => {
	it('should resolve config filePath when called by valid networkID', async () => {
		const expectedConfigPath = resolve(`${__dirname}../../../../config/testnet/config.json`);
		const networkID = '15f0dacc1060e91818224a94286b13aa04279c640bd5d6f193182031d133df7c';
		const configPath = await resolveConfigPathByNetworkID(networkID);
		expect(configPath).toBe(expectedConfigPath);
	});

	it('should throw error when called by invalid networkID', async () => {
		await expect(resolveConfigPathByNetworkID('invalid')).rejects.toThrow();
	});
});

describe('Test createBackup method', () => {
	it('should create backup', async () => {
		await createBackup((configV3 as unknown) as ApplicationConfigV3);
		expect(fs.existsSync(expectedBackupPath)).toBe(true);
	});
});

describe('Test getConfig method', () => {
	const networkIdentifier = '4c09e6a781fc4c7bdb936ee815de8f94190f8a7519becd9de2081832be309a99';
	const configPath = join(__dirname, '../../..', 'test/unit/fixtures/lisk-core');

	it('should return valid config when custom config is not available', async () => {
		const config = await getConfig(
			mockCommand as Command,
			configPath,
			networkIdentifier,
			undefined,
		);
		const expectedConfig = {
			system: {
				dataPath: '~/.lisk',
			},
			rpc: {
				modes: ['ws'],
				port: 7887,
				host: '127.0.0.1',
				allowedMethods: [],
			},
			genesis: {
				block: {
					fromFile: './config/genesis_block.blob',
				},
				blockTime: 10,
				chainID: '00000000',
				maxTransactionsSize: 15360,
				minimumCertifyHeight: 1,
			},
			network: {
				version: '4.0',
				seedPeers: [],
				port: 7667,
			},
			transactionPool: {
				maxTransactions: 4096,
				maxTransactionsPerAccount: 64,
				transactionExpiryTime: 10800000,
				minEntranceFeePriority: '0',
				minReplacementFeeDifference: '10',
			},
			plugins: {},
		};

		expect(config).toEqual(expectedConfig);
	});

	it('should return valid config when custom config is available', async () => {
		const customConfig = join(__dirname, '../../..', 'test/unit/fixtures/customConfig.json');
		const config = await getConfig(Command as any, configPath, networkIdentifier, customConfig);

		const expectedConfig = {
			system: {
				dataPath: '~/.customNode',
			},
			rpc: {
				modes: ['ws'],
				port: 7000,
				host: '0.0.0.0',
				allowedMethods: [],
			},
			genesis: {
				block: {
					fromFile: './config/genesis_block.blob',
				},
				blockTime: 10,
				chainID: '00000000',
				maxTransactionsSize: 15360,
				minimumCertifyHeight: 1,
			},
			network: {
				version: '4.0',
				seedPeers: [],
				port: 7667,
			},
			transactionPool: {
				maxTransactions: 4096,
				maxTransactionsPerAccount: 64,
				transactionExpiryTime: 10800000,
				minEntranceFeePriority: '0',
				minReplacementFeeDifference: '10',
			},
			plugins: {},
		};

		expect(config).toEqual(expectedConfig);
	});
});
