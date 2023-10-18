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
		'--seed-peers=<value>',
	];

	const userInputs: Record<string, string[]> = {
		valid: [
			'-c ./custom-config.json',
			'-c=./custom-config.json',
			'--config=./custom-config.json',
			'--config ./custom-config.json',
			'--seed-peers 127.0.0.1:7667',
			'--seed-peers 127.0.0.1:7667,127.0.0.1:7777',
			'--seed-peers=127.0.0.1:7667',
			'--seed-peers=127.0.0.1:7667,12.0.0.1:7777',
		],
		withNetwork: [
			'-n mainnet',
			'-n=mainnet',
			'--network mainnet',
			'--network=mainnet',
			'-n mainnet --api-ws --api-host 0.0.0.0',
			'--network=mainnet --api-ws --api-host 0.0.0.0',
		],
		withUnknownFlags: [
			'--unknown-flag',
			'--seed-peers=127.0.0.1:7667 --unknown-flag',
			'--seed-peers=127.0.0.1:7667 --api-ws a --unknown-flag',
		],
		withValidFlagsButUnexpectedValues: ['--seed-peers=127.0.0.1:7667 --api-ws a'],
		withFlagsWithoutValues: ['--seed-peers', '--seed-peers -c', '-c', '-c --api-ws'],
		withValuesWithoutFlags: ['a'],
		withNoUserInput: ['', '    '],
	};

	describe('with valid params', () => {
		userInputs.valid.forEach(startParams => {
			it(`should return 'true' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(true);
			});
		});
	});

	describe('with network specified in the params', () => {
		userInputs.withNetwork.forEach(startParams => {
			it(`should return 'false' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});

	describe('with unknown flags specified in the params', () => {
		userInputs.withUnknownFlags.forEach(startParams => {
			it(`should return 'false' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});

	describe('with flags expecting no values but values specified in the params', () => {
		userInputs.withValidFlagsButUnexpectedValues.forEach(startParams => {
			it(`should return 'false' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});

	describe('with flags without values but expecting values or options in the params', () => {
		userInputs.withFlagsWithoutValues.forEach(startParams => {
			it(`should return 'false' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});

	describe('with only options or values specified in the params', () => {
		userInputs.withValuesWithoutFlags.forEach(startParams => {
			it(`should return 'false' with following params: '${startParams}'`, async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});

	describe('with no inputs specified in the params', () => {
		userInputs.withNoUserInput.forEach(startParams => {
			it("should return 'false' with empty params", async () => {
				expect(await validateStartCommandParams(allowedFlags, startParams)).toBe(false);
			});
		});
	});
});
