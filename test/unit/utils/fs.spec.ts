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
import { join } from 'path';

import {
	createTarball,
	extractTarBall,
	exists,
	rmdir,
	copyDir,
	write,
	copyFile,
} from '../../../src/utils/fs';
import { configV3 } from '../fixtures/config';

const testDir = join(__dirname, 'test/data');
const tarFilePath = join(__dirname, '../../..', 'test/unit/fixtures/blockchain.db.tar.gz');

afterAll(async () => rmdir(testDir, { force: true, recursive: true }));

describe('Test extractTarBall method', () => {
	it('should extract tar file', async () => {
		const outputPath = `${testDir}/blockchain.db`;
		await expect(exists(outputPath)).resolves.toBe(false);

		// Extract tar file
		await expect(extractTarBall(tarFilePath, testDir)).resolves.toBe(true);
		await expect(exists(outputPath)).resolves.toBe(true);
	});

	it('should throw error -> invalid filepath', async () => {
		const filePath = 'invalid';
		await expect(extractTarBall(filePath, testDir)).rejects.toThrow();
	});

	it('should throw error -> empty string tar filepath', async () => {
		await expect(extractTarBall('', testDir)).rejects.toThrow();
	});

	it('should throw error -> empty string directoryPath', async () => {
		await expect(extractTarBall(tarFilePath, '')).rejects.toThrow();
	});
});

describe('Test rmdir method', () => {
	it('should return false when called with a directory path', async () => {
		expect(await exists(testDir)).toBe(true);
		const response = await rmdir(testDir);
		expect(response).toBe(true);
		expect(await exists(testDir)).toBe(false);
	});

	it('should throw when called with empty string', async () => {
		await expect(rmdir('')).rejects.toThrow();
	});
});

describe('Test copyDir method', () => {
	it('should copy directory', async () => {
		const sourcePath = join(__dirname, '../../..', 'test/unit/fixtures');
		const destinationPath = `${testDir}/fixtures`;
		await copyDir(sourcePath, destinationPath);
		expect(await exists(destinationPath)).toBe(true);
	});

	it('should throw when called with empty string', async () => {
		await expect(copyDir('', '')).rejects.toThrow();
	});
});

describe('Test write method', () => {
	it('should write to file when write() method is called', async () => {
		const filePath = `${testDir}/config.json`;
		expect(await exists(filePath)).toBe(false);

		await write(filePath, JSON.stringify(configV3, null, '\t'));

		expect(await exists(filePath)).toBe(true);
	});

	it('should throw when called with empty string', async () => {
		await expect(write('', '')).rejects.toThrow();
	});
});

describe('Test copyFile method', () => {
	it('should copy file', async () => {
		const srcPath = join(__dirname, '../fixtures/blockchain.db.tar.gz');
		const destPath = `${testDir}/blockchain.db.tar.gz`;
		expect(await exists(destPath)).toBe(false);

		await copyFile(srcPath, destPath);

		expect(await exists(destPath)).toBe(true);
	});

	it('should throw when called with empty string', async () => {
		await expect(copyFile('', '')).rejects.toThrow();
	});
});

describe('Test createTarball method', () => {
	it('should create tar.gz file', async () => {
		const filePath = join(__dirname, '../fixtures/genesis_block.json');
		const outputDir = `${testDir}/fixtures`;
		const expectedTarFilePath = `${testDir}/fixtures/genesis_block.json.tar.gz`;

		expect(await exists(expectedTarFilePath)).toBe(false);

		await createTarball(filePath, outputDir);

		expect(await exists(expectedTarFilePath)).toBe(true);
	});

	it('should throw when called with empty string', async () => {
		await expect(createTarball('', '')).rejects.toThrow();
	});
});
