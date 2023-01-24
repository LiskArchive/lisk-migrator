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
import debugInit from 'debug';
import cli from 'cli-ux';
import { existsSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { validator } from '@liskhq/lisk-validator';

import { ApplicationConfig } from 'lisk-framework';
import { Config } from '../types';
import { KEEP_EVENTS_FOR_HEIGHTS, NETWORK_CONSTANT } from '../constants';
import { applicationConfigSchema } from '../schemas';

const debug = debugInit('lisk:migrator');

export const isBinaryBuild = (corePath: string): boolean => existsSync(join(corePath, '.build'));

export const getConfig = async (corePath: string, customConfigPath?: string): Promise<Config> => {
	const command = [];

	const [network] = readdirSync(`${corePath}/config`);

	let compiledConfigPath = `${corePath}/config/${network}/config.json`;

	command.push(`cd ${corePath}`);

	if (isBinaryBuild(corePath)) {
		command.push('&& source env.sh');
	}

	if (customConfigPath) {
		command.push(`--config ${customConfigPath}`);
		compiledConfigPath = customConfigPath;
	}

	const fullCommand = command.join(' ');

	debug(`Core path: ${corePath}`);
	debug(`Cmd: ${fullCommand}`);

	cli.action.start('Compiling Lisk Core configuration');
	// Executing command to compile the configuration
	// 	to use the "source" command on Linux we have to explicity set shell to bash
	execSync(fullCommand, { shell: '/bin/bash' });
	cli.action.stop();

	cli.action.start('Loading Lisk Core configuration');
	const config = await import(compiledConfigPath);
	cli.action.stop();

	return config;
};

export const resolveConfigPathByNetworkID = async (networkIdentifier: string): Promise<string> => {
	const network = NETWORK_CONSTANT[networkIdentifier].name;
	const configFilePath = resolve(process.cwd(), `config/${network}/config.json`);
	return configFilePath;
};

export const createBackup = async (config: Config): Promise<any> => {
	const backupPath = `${process.cwd()}/backup`;
	mkdirSync(backupPath, { recursive: true });
	writeFileSync(resolve(`${backupPath}/config.json`), JSON.stringify(config, null, '\t'));
};

export const migrateUserConfig = async (
	config: Config,
	liskCorePath: string,
	tokenID: string,
): Promise<Record<string, unknown>> => {
	const liskCoreV4Config = {
		system: {
			version: '4.0.0',
			dataPath: liskCorePath,
			keepEventsForHeights: KEEP_EVENTS_FOR_HEIGHTS,
			logLevel: config.logger.consoleLogLevel,
		},
		rpc: {
			modes: ['ipc', 'ws'],
			port: config.rpc.port || 7887,
			host: config.rpc.host || '127.0.0.1',
		},
		genesis: {
			block: {
				fromFile: './config/genesis_block.blob',
			},
			blockTime: config.genesisConfig.blockTime,
			bftBatchSize: 103,
			chainID: tokenID.slice(0, 8),
			maxTransactionsSize: config.genesisConfig.maxPayloadLength,
		},
		network: {
			...config.network,
			version: '1.0',
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 10800000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		generator: {
			keys: {},
		},
		modules: {},
		plugins: config.plugins,
	};

	return liskCoreV4Config;
};

export const validateConfig = async (config: ApplicationConfig): Promise<boolean> => {
	const isValidConfig = (await validator.validate(applicationConfigSchema, config)) as unknown;
	if (!isValidConfig) return false;
	return true;
};

export const writeConfig = async (config: ApplicationConfig, outputPath: string): Promise<void> => {
	if (existsSync(outputPath)) {
		unlinkSync(outputPath);
	}

	mkdirSync(outputPath, { recursive: true });

	writeFileSync(resolve(outputPath, 'config.json'), JSON.stringify(config));
};
