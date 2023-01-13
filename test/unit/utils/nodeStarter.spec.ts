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
import { isAppVersion3 } from '../../../src/utils/node';

describe('isAppVersion3', () => {
	it('Should return true for a version of 3.*.*', async () => {
		const response = await isAppVersion3('3.1.1');
		expect(response).toBe(true);
	});

	it('Should return false for a version that does not start with 3', async () => {
		const response = await isAppVersion3('4.1.1');
		expect(response).toBe(false);
	});
});
