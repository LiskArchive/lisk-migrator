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
import Command from '@oclif/command';
import { log, error } from 'console';

import { getCommandsToExecPostMigration, writeCommandsToExec } from '../../../src/utils/commands';
import { exists } from '../../../src/utils/fs';
import { FILE_NAME, NETWORK_CONSTANT } from '../../../src/constants';

const outputDir = join(__dirname, '../../..', 'test/unit/fixtures');

afterAll(() => fs.removeSync(join(outputDir, FILE_NAME.COMMANDS_TO_EXEC)));

const mockCommand = {
	log,
	error,
};

describe('Test getCommandsToExecPostMigration method', () => {
	it('should create commandsToExecute text file', async () => {
		const networkConstant =
			NETWORK_CONSTANT['4c09e6a781fc4c7bdb936ee815de8f94190f8a7519becd9de2081832be309a99'];

		const commandsToExecute = await getCommandsToExecPostMigration(networkConstant, outputDir);
		await writeCommandsToExec(
			mockCommand as Command,
			networkConstant,
			outputDir,
			commandsToExecute,
		);
		expect(await exists(`${outputDir}/${FILE_NAME.COMMANDS_TO_EXEC}`)).toBe(true);
	});
});
