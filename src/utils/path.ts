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
import { isAbsolute, join } from 'path';
import { DEFAULT_LISK_CORE_PATH } from '../constants';

export const resolveAbsolutePath = (path: string) => {
	if (isAbsolute(path)) {
		return path;
	}

	if (path.startsWith('~')) {
		return path.replace('~', homedir());
	}

	return join(process.cwd(), path);
};

export const verifyOutputPath = (_outputPath: string): void | Error => {
	const absLiskCorePath = resolveAbsolutePath(DEFAULT_LISK_CORE_PATH);
	const absOutputPath = resolveAbsolutePath(_outputPath);

	if (absOutputPath.startsWith(absLiskCorePath)) {
		throw new Error(
			`Output path '${_outputPath}' is not allowed. Please restart the migrator with a different output path.`,
		);
	}
};
