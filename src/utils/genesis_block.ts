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
// TODO: Implement with the issue https://github.com/LiskHQ/lisk-migrator/issues/54
export const createGenesisBlock = async (
	assets: Record<string, unknown>,
	outputPath: string,
): Promise<any> => ({
	assets,
	outputPath,
});
