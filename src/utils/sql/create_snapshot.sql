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

DROP TABLE IF EXISTS mem_accounts_snapshot;
DROP TABLE IF EXISTS mem_accounts2multisignatures_snapshot;
CREATE TABLE mem_accounts_snapshot AS TABLE mem_accounts;
CREATE TABLE mem_accounts2multisignatures_snapshot AS TABLE mem_accounts2multisignatures;