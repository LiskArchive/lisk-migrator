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
import { ERROR_CODE } from '../constants';

export class MigratorException extends Error {
	public code: number = ERROR_CODE.DEFAULT;

	public constructor(message: string, code: number) {
		super(message);
		this.code = code;
	}
}
