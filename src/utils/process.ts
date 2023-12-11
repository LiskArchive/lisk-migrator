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
import { exec } from 'child_process';

export const execAsync = async (cmd: string): Promise<string> =>
	new Promise((resolve, reject) => {
		exec(cmd, (error, stdout) => {
			if (error) {
				return reject(error);
			}
			return resolve(stdout);
		});
	});
