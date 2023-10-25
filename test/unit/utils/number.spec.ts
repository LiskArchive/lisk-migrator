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
import { formatInt } from '../../../src/utils/number';

describe('Test formatInt method', () => {
	it('should return formatted result when called with valid BigInt', async () => {
		const formattedResult = formatInt(BigInt(100));
		await expect(typeof formattedResult).toBe('string');
	});

	it('should throw error when called with negative number', async () => {
		await expect(() => formatInt(-1)).toThrow();
	});

	it('should throw error when called with negative BigInteger', async () => {
		await expect(() => formatInt(BigInt(-1))).toThrow();
	});
});
