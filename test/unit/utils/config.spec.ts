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
import { ApplicationConfig } from 'lisk-framework';
import { migrateUserConfig, validateConfig, writeConfig } from '../../../src/utils/config';

describe('Migrate user configuration', () => {
	const tokenID = '0400000000000000';
	const liskCorePath = '~/.lisk';
	const migratedConfigFilePath = `${process.cwd()}/test/config`;
	const oldConfigFile = fs.readFileSync(`${process.cwd()}/test/unit/fixtures/config.json`, {
		encoding: 'utf-8',
	});
	const oldConfigParsed = JSON.parse(oldConfigFile);

	afterAll(() => fs.removeSync(migratedConfigFilePath));

	it('should migrate user configuration', async () => {
		const config = ((await migrateUserConfig(
			oldConfigParsed,
			liskCorePath,
			tokenID,
		)) as unknown) as ApplicationConfig;
		expect(Object.getOwnPropertyNames(config).length).toBeGreaterThan(0);

		const isValidConfig = await validateConfig(config);
		expect(isValidConfig).toBe(true);

		await writeConfig(config, migratedConfigFilePath);
		expect(fs.existsSync(migratedConfigFilePath)).toBe(true);
		expect(fs.existsSync(`${migratedConfigFilePath}/config.json`)).toBe(true);
	});
});
