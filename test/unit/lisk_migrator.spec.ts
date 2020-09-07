import 'jest-extended';
import { Command } from '@oclif/command';
import LiskMigrator from '../../src/index';
import * as utils from '../../src/utils';
import { Config } from '../../src/types';

jest.mock('../../src/utils/config');
jest.mock('../../src/utils/storage');
jest.mock('../../src/utils/genesis_block');
jest.mock('../../src/utils/chain');

describe('LiskMigrator', () => {
	let result;
	let appConfig: Config;

	const db = {
		query: jest.fn(),
		$pool: {
			end: jest.fn(),
		},
	};

	let snapshotHeight = 6778;
	const requiredFlags = ['-s', snapshotHeight.toString()];
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		result = [];
		appConfig = {
			components: { storage: { user: '', database: '', password: '', host: '', port: 3 } },
			app: {
				version: '2.1.4',
				minVersion: '123',
				protocolVersion: '1.0',
				genesisConfig: { EPOCH_TIME: '1344', BLOCK_TIME: 10 },
			},
		};
		jest.spyOn(process.stdout, 'write').mockImplementation(val => result.push(val));
		jest.spyOn(utils, 'getConfig').mockResolvedValue(appConfig);
		jest.spyOn(utils, 'createDb').mockReturnValue(db as never);
		loggerSpy = jest.spyOn(Command.prototype, 'log');
	});

	describe('flags', () => {
		describe('lisk core path', () => {
			it('should use the lisk core path if provided', async () => {
				await LiskMigrator.run(requiredFlags.concat(['-p', '/my/directory']));

				expect(loggerSpy).toHaveBeenCalledWith(
					'Loading up configuration from path: ',
					'/my/directory',
				);
				expect(utils.getConfig).toHaveBeenCalledWith('/my/directory');
			});

			it('should use current directory if the flag is not provided', async () => {
				await LiskMigrator.run(requiredFlags);

				expect(loggerSpy).toHaveBeenCalledWith(
					'Loading up configuration from path: ',
					process.cwd(),
				);
				expect(utils.getConfig).toHaveBeenCalledWith(process.cwd());
			});
		});

		describe('output', () => {
			it('should use the output path if provided', async () => {
				await LiskMigrator.run(requiredFlags.concat(['-o', '/my/directory/my_block.json']));

				expect(utils.writeGenesisBlock).toHaveBeenCalledWith(
					undefined,
					'/my/directory/my_block.json',
				);
			});

			it('should use current directory if the flag is not provided', async () => {
				await LiskMigrator.run(requiredFlags);

				expect(utils.writeGenesisBlock).toHaveBeenCalledWith(
					undefined,
					`${process.cwd()}/genesis_block.json`,
				);
			});
		});

		describe('snapshot height', () => {
			it('should fail if no height is provided', async () => {
				await expect(LiskMigrator.run()).rejects.toThrow(
					/^Missing required flag:\n\s*-s, --snapshot-height SNAPSHOT-HEIGHT/,
				);
			});

			it('should not fail if height is provided via flag', async () => {
				await expect(LiskMigrator.run(requiredFlags)).resolves.toBeUndefined();
				expect(utils.observeChainHeight).toHaveBeenCalledWith({
					db,
					height: snapshotHeight,
					delay: 500,
				});
				expect(loggerSpy).toHaveBeenCalledWith(`Waiting for snapshot height: ${snapshotHeight}`);
				expect(loggerSpy).toHaveBeenCalledWith(`Taking snapshot at height: ${snapshotHeight}`);
			});

			it('should not fail if height is provided via env variable', async () => {
				process.env.SNAPSHOT_HEIGHT = '67';
				await expect(LiskMigrator.run()).resolves.toBeUndefined();
				expect(utils.observeChainHeight).toHaveBeenCalledWith({ db, height: 67, delay: 500 });
				expect(loggerSpy).toHaveBeenCalledWith('Waiting for snapshot height: 67');
				expect(loggerSpy).toHaveBeenCalledWith('Taking snapshot at height: 67');
			});
		});

		describe('wait threshold', () => {
			it('should use 201 as default if no flag provided', async () => {
				await LiskMigrator.run(requiredFlags);

				expect(utils.observeChainHeight).toHaveBeenCalledWith({
					db,
					height: snapshotHeight + 201,
					delay: 500,
				});
				expect(loggerSpy).toHaveBeenCalledWith(
					`Waiting for threshold height: ${snapshotHeight + 201}`,
				);
			});

			it('should use provided wait threshold as flag', async () => {
				await LiskMigrator.run(requiredFlags.concat(['-w', '400']));

				expect(utils.observeChainHeight).toHaveBeenCalledWith({
					db,
					height: snapshotHeight + 400,
					delay: 500,
				});
				expect(loggerSpy).toHaveBeenCalledWith(
					`Waiting for threshold height: ${snapshotHeight + 400}`,
				);
			});

			it('should use provided wait threshold from env variable', async () => {
				process.env.SNAPSHOT_WAIT_THRESHOLD = '600';
				await LiskMigrator.run(requiredFlags);

				expect(utils.observeChainHeight).toHaveBeenCalledWith({
					db,
					height: snapshotHeight + 600,
					delay: 500,
				});
				expect(loggerSpy).toHaveBeenCalledWith(
					`Waiting for threshold height: ${snapshotHeight + 600}`,
				);
			});

			it('should use 201 as default if NODE_ENV != test', async () => {
				process.env.NODE_ENV = 'development';
				await LiskMigrator.run(requiredFlags.concat(['-w', '400']));

				expect(utils.observeChainHeight).toHaveBeenCalledWith({
					db,
					height: snapshotHeight + 201,
					delay: 500,
				});
				expect(loggerSpy).toHaveBeenCalledWith(
					`Waiting for threshold height: ${snapshotHeight + 201}`,
				);
				process.env.NODE_ENV = 'test';
			});
		});
	});

	it('should fail if unable to detect lisk-core version', async () => {
		jest
			.spyOn(utils, 'getConfig')
			.mockResolvedValue({ ...appConfig, app: { ...appConfig.app, version: undefined } as any });

		await expect(LiskMigrator.run(requiredFlags)).rejects.toThrow(
			'Unable to detect the lisk-core version.',
		);
	});

	it.each(['2.1.3', '2.1.7'])(
		'should fail if lisk-core version "$1" does not satisfy',
		async (version: string) => {
			jest
				.spyOn(utils, 'getConfig')
				.mockResolvedValue({ ...appConfig, app: { ...appConfig.app, version } });

			await expect(LiskMigrator.run(requiredFlags)).rejects.toThrow(
				`Lisk-Migrator utility is not compatible for lisk-core version ${version}. Compatible versions range is: >=2.1.4 <=2.1.6`,
			);
		},
	);

	describe('when all works fine', () => {
		const corePath = '/dir/core';
		const outputPath = '/output/custom_genesis.json';
		const waitThreshold = 303;
		const genesisBlock = { myBlock: '1dfe' };

		beforeEach(async () => {
			snapshotHeight = 677;

			(utils.createGenesisBlockFromStorage as jest.Mock).mockResolvedValue(genesisBlock);

			await LiskMigrator.run([
				'-p',
				corePath,
				'-o',
				outputPath,
				'-s',
				snapshotHeight.toString(),
				'-w',
				waitThreshold.toString(),
			]);
		});

		it('should config from provided core path', () => {
			expect(utils.getConfig).toHaveBeenCalledTimes(1);
			expect(utils.getConfig).toHaveBeenCalledWith(corePath);
			expect(loggerSpy).toHaveBeenCalledWith('Loading up configuration from path: ', corePath);
		});

		it('should detect and verify the lisk-core version', () => {
			expect(loggerSpy).toHaveBeenCalledWith('Verifying Lisk-Core version...');
			expect(loggerSpy).toHaveBeenCalledWith(`Lisk-Core version ${appConfig.app.version} detected`);
		});

		it('should create and verify db connection', () => {
			expect(loggerSpy).toHaveBeenCalledWith('Verifying database connection...');
			expect(utils.createDb).toHaveBeenCalledTimes(1);
			expect(utils.createDb).toHaveBeenCalledWith(appConfig.components.storage);
			expect(utils.createDb).toHaveBeenCalledAfter(utils.getConfig as never);
			expect(utils.verifyConnection).toHaveBeenCalledTimes(1);
			expect(utils.verifyConnection).toHaveBeenCalledWith(db);
			expect(utils.verifyConnection).toHaveBeenCalledAfter(utils.createDb as never);
			expect(loggerSpy).toHaveBeenCalledWith('Verified database connection');
		});

		it('should wait for snapshot height', () => {
			expect(loggerSpy).toHaveBeenCalledWith(`Waiting for snapshot height: ${snapshotHeight}`);
			expect(utils.observeChainHeight).toHaveBeenCalledTimes(2);
			expect(utils.observeChainHeight).toHaveBeenNthCalledWith(1, {
				db,
				height: snapshotHeight,
				delay: 500,
			});
			expect(utils.observeChainHeight).toHaveBeenCalledAfter(utils.verifyConnection as never);
		});

		it('should take the snapshot', () => {
			expect(loggerSpy).toHaveBeenCalledWith(`Taking snapshot at height: ${snapshotHeight}`);
			expect(utils.createSnapshot).toHaveBeenCalledTimes(1);
			expect(utils.createSnapshot).toHaveBeenCalledWith(db);
			expect(utils.createSnapshot).toHaveBeenCalledAfter(utils.observeChainHeight as never);
		});

		it('should wait for threshold height', () => {
			expect(loggerSpy).toHaveBeenCalledWith(
				`Waiting for threshold height: ${snapshotHeight + waitThreshold}`,
			);
			expect(utils.observeChainHeight).toHaveBeenCalledTimes(2);
			expect(utils.observeChainHeight).toHaveBeenNthCalledWith(2, {
				db,
				height: snapshotHeight + waitThreshold,
				delay: 500,
			});
			// expect(utils.observeChainHeight).toHaveBeenCalledAfter(utils.createSnapshot as never);
		});

		it('should create genesis block', () => {
			expect(loggerSpy).toHaveBeenCalledWith('Creating genesis block...');
			expect(utils.createGenesisBlockFromStorage).toHaveBeenCalledTimes(1);
			expect(utils.createGenesisBlockFromStorage).toHaveBeenCalledWith({
				db,
				snapshotHeight,
				blockTime: appConfig.app.genesisConfig.BLOCK_TIME,
				epochTime: appConfig.app.genesisConfig.EPOCH_TIME,
			});
			expect(utils.createGenesisBlockFromStorage).toHaveBeenCalledAfter(
				utils.observeChainHeight as never,
			);
		});

		it('should write json block json to output path', () => {
			expect(loggerSpy).toHaveBeenCalledWith('Exporting genesis block...');
			expect(utils.writeGenesisBlock).toHaveBeenCalledTimes(1);
			expect(utils.writeGenesisBlock).toHaveBeenCalledWith(genesisBlock, outputPath);
			expect(utils.writeGenesisBlock).toHaveBeenCalledAfter(
				utils.createGenesisBlockFromStorage as never,
			);
		});
	});
});
