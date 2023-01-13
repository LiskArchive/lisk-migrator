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
import { execAsync } from '../../../src/utils/process';

describe('execAsync', () => {
	it('Should execute ls command succesfully', async () => {
		const response = await execAsync('ls');
		expect(response.length).toBeGreaterThan(0);
	});
});
