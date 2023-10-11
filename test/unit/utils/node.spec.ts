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
import { validateStartCommandParams } from '../../../src/utils/node';

describe('Test validateStartCommandParams method', () => {
	const allowedFlags = [
		'-c, --config=<value>',
		'-d, --data-path=<value>',
		'-l, --log=<option>',
		'-n, --network=<value>',
		'-p, --port=<value>',
		'-u, --genesis-block-url=<value>',
		'--api-host=<value> ',
		'--api-http ',
		'--api-ipc ',
		'--api-port=<value> ',
		'--api-ws ',
		'--dashboard-plugin-port=<value> ',
		'--enable-chain-connector-plugin ',
		'--enable-dashboard-plugin ',
		'--enable-faucet-plugin ',
		'--enable-forger-plugin ',
		'--enable-monitor-plugin ',
		'--enable-report-misbehavior-plugin ',
		'--faucet-plugin-port=<value> ',
		'--monitor-plugin-port=<value> ',
		'--monitor-plugin-whitelist=<value> ',
		'--overwrite-config ',
		'--overwrite-genesis-block ',
		'--seed-peers=<value> ',
	];

	it('should return true when valid parameters passed', async () => {
		let startParams = '-n mainnet --api-ws --api-host 0.0.0.0';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(true);

		startParams = '--network mainnet --api-ws --api-host 0.0.0.0 --enable-chain-connector-plugin';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(true);

		startParams =
			'--network mainnet --api-ws --api-host 0.0.0.0 --api-port 8000 --enable-chain-connector-plugin -c=~/config.json';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(true);
	});

	it('should return false when parameters passed without value', async () => {
		let startParams = '-n mainnet --api-ws --api-host';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);

		startParams = '-n mainnet --api-ws --api-host 0.0.0.0 --api-port';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);

		startParams = '-n mainnet --api-ws --api-host 0.0.0.0 --api-port 8000 --genesis-block-url';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
	});

	it('should return false when parameter is invalid', async () => {
		let startParams = '--network mainnet --api-ws --api-ho';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);

		startParams = '-n mainnet --api-ws --api-host 0.0.0.0 --api-port 8000 --genesis-block';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);

		startParams =
			'-n mainnet --api-ws --api-host 0.0.0.0 --api-port 8000 --genesis-block-url --enable';
		expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
	});
});
