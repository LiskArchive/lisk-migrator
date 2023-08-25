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
import { homedir } from 'os';
import { join } from 'path';
import { resolveAbsolutePath } from '../../../src/utils/node';

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
});
