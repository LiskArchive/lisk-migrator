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
import { Command } from '@oclif/command';
import { homedir } from 'os';
import { DEFAULT_LISK_CORE_PATH } from '../constants';

export const resolveAbsolutePath = (path: string) => {
	const homeDirectory = homedir();
	return homeDirectory ? path.replace(/^~(?=$|\/|\\)/, homeDirectory) : path;
};

export const verifyOutputPath = (_this: Command, _outputPath: string): void | Error => {
	const absLiskCorePath = resolveAbsolutePath(DEFAULT_LISK_CORE_PATH);
	const absOutputPath = resolveAbsolutePath(_outputPath);

	if (absOutputPath.startsWith(absLiskCorePath)) {
		_this.error(
			`Output path '${_outputPath}' is not allowed. Please restart the migrator with a different output path.`,
		);
	}
};
