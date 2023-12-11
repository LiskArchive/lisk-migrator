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
 *
 */
import { homedir } from 'os';
import { join } from 'path';

import { DEFAULT_LISK_CORE_PATH } from '../../../src/constants';
import {
	resolveAbsolutePath,
	verifyOutputPath,
	resolveSnapshotPath,
} from '../../../src/utils/path';

describe('Test resolveAbsolutePath method', () => {
	it('should resolve absolute path when called with valid path which contains ~', async () => {
		const path = '~/.test/testFolder';
		const expectedResult = join(homedir(), '.test/testFolder');
		const absolutePath = resolveAbsolutePath(path);
		expect(absolutePath).toBe(expectedResult);
	});

	it('should resolve absolute path when called with valid path', async () => {
		const path = '/.test/testFolder';
		const absolutePath = resolveAbsolutePath(path);
		expect(absolutePath).toBe(path);
	});

	it('should resolve relative path (current directory) when called with valid path', async () => {
		const path = './test/testFolder';
		const absolutePath = resolveAbsolutePath(path);
		expect(absolutePath).toBe(join(process.cwd(), path));
	});

	it('should resolve relative path (parent directory) when called with valid path', async () => {
		const path = '../test/testFolder';
		const absolutePath = resolveAbsolutePath(path);
		expect(absolutePath).toBe(join(process.cwd(), path));
	});
});

describe('Test verifyOutputPath method', () => {
	it('should throw error when user provides the output path same as the default Lisk Core data directory', async () => {
		expect(() => verifyOutputPath(DEFAULT_LISK_CORE_PATH)).toThrow(
			`Output path '${DEFAULT_LISK_CORE_PATH}' is not allowed. Please restart the migrator with a different output path.`,
		);
	});

	it('should throw error when user provides the output path starting with the default Lisk Core data directory', async () => {
		expect(() => verifyOutputPath(`${DEFAULT_LISK_CORE_PATH}/output`)).toThrow(
			`Output path '${DEFAULT_LISK_CORE_PATH}/output' is not allowed. Please restart the migrator with a different output path.`,
		);
	});

	it("should not throw error when output path is '~/output'", async () => {
		const outputPath = '~/output';
		expect(() => verifyOutputPath(outputPath)).not.toThrow();
	});

	it("should not throw error when output path is '/root/output'", async () => {
		const outputPath = '/root/output';
		expect(() => verifyOutputPath(outputPath)).not.toThrow();
	});

	it("should not throw error when output path is './output'", async () => {
		const outputPath = './output';
		expect(() => verifyOutputPath(outputPath)).not.toThrow();
	});
});

describe('Test resolveSnapshotPath method', () => {
	const dataDir = join(__dirname, '../../..', 'test/unit/fixtures/data');
	const liskCoreV3DataPath = '~/.lisk/lisk-core/config/data';
	const inputSnapshotPath = join(__dirname, '../../..', 'test/unit/fixtures/data/snapshotDir');

	it('should return valid snapshot path when useSnapshot is false', async () => {
		const useSnapshot = false;
		const snapshotPath = await resolveSnapshotPath(
			useSnapshot,
			inputSnapshotPath,
			dataDir,
			liskCoreV3DataPath,
		);
		const expectedResult = '~/.lisk/lisk-core/config/data/data/backup';
		expect(snapshotPath).toBe(expectedResult);
	});

	it('should return valid snapshot path when useSnapshot is true and snapshotPath is available', async () => {
		const useSnapshot = true;
		const snapshotPath = await resolveSnapshotPath(
			useSnapshot,
			inputSnapshotPath,
			dataDir,
			liskCoreV3DataPath,
		);
		expect(snapshotPath).toBe(inputSnapshotPath);
	});

	it('should return valid snapshot path when useSnapshot is true and snapshotPath ends with .tar,gz', async () => {
		const useSnapshot = true;
		const snapshotPath = await resolveSnapshotPath(
			useSnapshot,
			(undefined as unknown) as string,
			dataDir,
			liskCoreV3DataPath,
		);
		const expectedResult = join(dataDir, 'snapshotDir');
		expect(snapshotPath).toBe(expectedResult);
	});
});
