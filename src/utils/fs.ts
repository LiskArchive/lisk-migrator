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
import fs from 'fs-extra';
import * as tar from 'tar';

export const extractTarBall = async (
	filePath: string,
	directoryPath: string,
): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		if (fs.existsSync(directoryPath)) fs.rmdirSync(directoryPath, { recursive: true });
		fs.mkdirSync(directoryPath, { recursive: true });

		const fileStream = fs.createReadStream(filePath);
		fileStream.pipe(tar.extract({ cwd: directoryPath }));
		fileStream.on('error', async err => reject(new Error(err)));
		fileStream.on('end', async () => {
			resolve(true);
		});
	});
