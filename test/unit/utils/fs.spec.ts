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
import { extractTarBall, exists, rm } from '../../../src/utils/fs';

describe('Tests filesystem utilities', () => {
	const testDir = `${process.cwd()}/test/data`;
	const tarFilePath = `${process.cwd()}/test/unit/fixtures/blockchain.db.tar.gz`;

	// Remove test directory
	afterAll(async () => rm(testDir, { recursive: true }));

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
});
