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
import { join } from 'path';
import { getCommandsToExecPostMigration, writeCommandsToExec } from '../../../src/utils/commands';
import { exists } from '../../../src/utils/fs';
import { FILE_NAME } from '../../../src/constants';

const outputDir = join(__dirname, '../../..', 'test/unit/fixtures');

afterAll(() => fs.removeSync(join(outputDir, FILE_NAME.COMMANDS_TO_EXEC)));

describe('Test getCommandsToExecPostMigration method', () => {
	it('should create commandsToExecute text file', async () => {
		const commandsToExecute = await getCommandsToExecPostMigration(outputDir);
		await writeCommandsToExec(outputDir, commandsToExecute);
		expect(await exists(`${outputDir}/${FILE_NAME.COMMANDS_TO_EXEC}`)).toBe(true);
	});
});
