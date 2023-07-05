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

import { NetworkConfigLocal } from './types';

export const MODULE_NAME_LEGACY = 'legacy';
export const MODULE_NAME_AUTH = 'auth';
export const MODULE_NAME_TOKEN = 'token';
export const MODULE_NAME_POS = 'pos';
export const MODULE_NAME_INTEROPERABILITY = 'interoperability';

export const DB_KEY_CHAIN_STATE = 'chain';
export const DB_KEY_ACCOUNTS_ADDRESS = 'accounts:address';
export const DB_KEY_BLOCKS_HEIGHT = 'blocks:height';
export const DB_KEY_BLOCKS_ID = 'blocks:id';
export const DB_KEY_TRANSACTIONS_BLOCK_ID = 'transactions:blockID';
export const DB_KEY_TRANSACTIONS_ID = 'transactions:id';

export const CHAIN_STATE_DELEGATE_VOTE_WEIGHTS = 'dpos:delegateVoteWeights';
export const CHAIN_STATE_UNREGISTERED_ADDRESSES = 'unregisteredAddresses';

export const POS_INIT_ROUNDS = 60480;
export const MAX_COMMISSION = 10000;
export const NUMBER_ACTIVE_VALIDATORS = 101;
export const NUMBER_STANDBY_VALIDATORS = 2;
export const ROUND_LENGTH = NUMBER_ACTIVE_VALIDATORS + NUMBER_STANDBY_VALIDATORS;
export const MAX_BFT_WEIGHT_CAP = 1000;

export const SNAPSHOT_BLOCK_VERSION = 0;
export const SNAPSHOT_TIME_GAP = 0; // TODO: Update once decided
export const ALL_SUPPORTED_TOKENS_KEY = Buffer.alloc(0);

export const ADDRESS_LEGACY_RESERVE = hash(Buffer.from('legacyReserve', 'utf8')).slice(0, 20);
export const INVALID_BLS_KEY = Buffer.alloc(48, 0).toString('hex');
export const INVALID_ED25519_KEY = Buffer.alloc(32, 255).toString('hex');
export const DUMMY_PROOF_OF_POSSESSION = Buffer.alloc(96, 0).toString('hex');

export const CHAIN_NAME_MAINCHAIN = 'lisk_mainchain';

export const Q96_ZERO = Buffer.alloc(0);

const TOKEN_ID_LSK = Object.freeze({
	MAINNET: '0000000000000000',
	TESTNET: '0100000000000000',
}) as { [key: string]: string };

const HEIGHT_PREVIOUS_SNAPSHOT_BLOCK = Object.freeze({
	MAINNET: 16270293,
	TESTNET: 19333300,
});

export const NETWORK_CONSTANT: { [key: string]: NetworkConfigLocal } = {
	'4c09e6a781fc4c7bdb936ee815de8f94190f8a7519becd9de2081832be309a99': {
		name: 'mainnet',
		tokenID: TOKEN_ID_LSK.MAINNET,
		snapshotHeightPrevious: HEIGHT_PREVIOUS_SNAPSHOT_BLOCK.MAINNET,
	},
	'15f0dacc1060e91818224a94286b13aa04279c640bd5d6f193182031d133df7c': {
		name: 'testnet',
		tokenID: TOKEN_ID_LSK.TESTNET,
		snapshotHeightPrevious: HEIGHT_PREVIOUS_SNAPSHOT_BLOCK.TESTNET,
	},
};

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT_P2P = 7667;
export const DEFAULT_PORT_RPC = 7887;

export const EMPTY_STRING = '';
export const EMPTY_BYTES = Buffer.alloc(0);
export const SHA_256_HASH_LENGTH = 32;
export const BINARY_ADDRESS_LENGTH = 20;
export const TRANSACTION_ID_LENGTH = SHA_256_HASH_LENGTH;

export const DEFAULT_DATA_DIR = 'data';
export const EXTRACTED_SNAPSHOT_DIR = 'blockchain.db';

export const DEFAULT_VERSION = '0.1.0';
