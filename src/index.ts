/*
 * Copyright © 2020 Lisk Foundation
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
import { Command, flags as flagsParser } from '@oclif/command';

class LiskMigrator extends Command {
	public static description = 'describe the command here';

	public static flags = {
		// add --version flag to show CLI version
		version: flagsParser.version({ char: 'v' }),
		help: flagsParser.help({ char: 'h' }),
		// flag with a value (-n, --name=VALUE)
		name: flagsParser.string({ char: 'n', description: 'name to print' }),
		// flag with no value (-f, --force)
		force: flagsParser.boolean({ char: 'f' }),
	};

	public static args = [{ name: 'file' }];

	public async run(): Promise<void> {
		const { args, flags } = this.parse(LiskMigrator);

		const name = flags.name ?? 'world';
		this.log(`hello ${name} from ./src/index.ts`);
		if (args.file && flags.force) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			this.log(`you input --force and --file: ${args.file}`);
		}
	}
}

export = LiskMigrator;
