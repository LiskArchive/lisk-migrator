/*
 * Copyright © 2022 Lisk Foundation
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
import { hash } from '@liskhq/lisk-cryptography';

export const ROUND_LENGTH = 103;

export const MODULE_NAME_LEGACY = 'legacy';
export const MODULE_NAME_AUTH = 'auth';
export const MODULE_NAME_TOKEN = 'token';
export const MODULE_NAME_DPOS = 'dpos';
export const DB_KEY_CHAIN_STATE = 'chain';

export const CHAIN_STATE_UNREGISTERED_ADDRESSES = 'unregisteredAddresses';

export const DB_KEY_ACCOUNTS_ADDRESS = 'accounts:address';

export const ADDRESS_LEGACY_RESERVE = hash(Buffer.from('legacyReserve', 'utf8')).slice(0, 20);

export const TOKEN_ID_LSK_MAINCHAIN = 0x0000000000000000;

export const LOCAL_ID_LSK = Buffer.from([0, 0, 0, 0]);

export const INVALID_BLS_KEY = Buffer.alloc(48, 0);
export const INVALID_ED25519_KEY = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

export const DUMMY_PROOF_OF_POSSESSION = '';

export const RADIX_HEX = 16;
