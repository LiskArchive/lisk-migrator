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
jest.mock('cli-ux', () => ({ action: { start: jest.fn(), stop: jest.fn() } }));
jest.mock('../../src/utils/config');
jest.mock('../../src/utils/storage');
jest.mock('../../src/utils/genesis_block');
jest.mock('../../src/utils/chain');

// TODO: Add test cases with the issue https://github.com/LiskHQ/lisk-migrator/issues/54
describe('LiskMigrator', () => true);
