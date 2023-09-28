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
import { configV3, configV4 } from '../fixtures/config';
import {
	NETWORKS,
	getNetworkByNetworkID,
	migrateUserConfig,
	validateConfig,
	writeConfig,
	resolveConfigPathByNetworkID,
	createBackup,
} from '../../../src/utils/config';
import { ApplicationConfigV3 } from '../../../src/types';

const migratedConfigFilePath = join(__dirname, 'test/config');
const expectedBackupPath = join(__dirname, '../../..', 'backup');

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
		NETWORKS.forEach(networkInfo => {
			const network = getNetworkByNetworkID(networkInfo.networkID);
			expect(network).toBe(networkInfo.name);
		});
	});

	it('should throw error with unknown networkIdentifier', async () => {
		expect(() => getNetworkByNetworkID('unknown network identifier')).toThrowError(
			'Migrator running against unsupported network.',
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
