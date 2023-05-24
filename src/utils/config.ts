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
/* eslint-disable no-param-reassign */
import debugInit from 'debug';
import cli from 'cli-ux';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { validator } from '@liskhq/lisk-validator';

import { ApplicationConfig, applicationConfigSchema } from 'lisk-framework';
import { ConfigV3, Logger } from '../types';
import { DEFAULT_VERSION, NETWORK_CONSTANT } from '../constants';

const debug = debugInit('lisk:migrator');

const LOG_LEVEL_PRIORITY = Object.freeze({
	TRACE: 0,
	DEBUG: 1,
	INFO: 2,
	WARN: 3,
	ERROR: 4,
	FATAL: 5,
}) as Record<string, unknown>;

export const isBinaryBuild = (corePath: string): boolean => existsSync(join(corePath, '.build'));

export const getLogLevel = (logger: Logger): string => {
	const filteredLogLevelOptions = Object.keys(LOG_LEVEL_PRIORITY).reduce(
		(key: Record<string, unknown>, value: string) => {
			if (Object.values(logger).includes(value.toLowerCase())) {
				key[value] = LOG_LEVEL_PRIORITY[value];
			}
			return key;
		},
		{},
	);

	const logLevel = (Object.keys(filteredLogLevelOptions).find(
		key =>
			filteredLogLevelOptions[key] ===
			Math.min(...(Object.values(filteredLogLevelOptions) as Array<number>)),
	) as unknown) as string;

	return logLevel?.toLowerCase();
};

export const getConfig = async (corePath: string, customConfigPath?: string): Promise<ConfigV3> => {
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

export const createBackup = async (config: ConfigV3): Promise<void> => {
	const backupPath = `${process.cwd()}/backup`;
	mkdirSync(backupPath, { recursive: true });
	writeFileSync(resolve(`${backupPath}/config.json`), JSON.stringify(config, null, '\t'));
};

// TODO: Set up a default config file. Log properties and map migrated config values
export const migrateUserConfig = async (
	configV3: ConfigV3,
	configV4: ApplicationConfig,
): Promise<ApplicationConfig> => {
	// Assign default version if not available
	if (!configV4.system.version) {
		cli.action.start(`Migrating config property 'system' version to: ${DEFAULT_VERSION}.`);
		configV4.system.version = DEFAULT_VERSION;
		cli.action.stop();
	}

	if (configV3.rootPath) {
		cli.action.start(`Migrating config property 'system' dataPath to: ${configV3.rootPath}.`);
		configV4.system.dataPath = configV3.rootPath;
		cli.action.stop();
	}

	if (configV3.logger) {
		const logLevel = getLogLevel(configV3.logger);
		cli.action.start(`Migrating config property 'system' logLevel to: ${logLevel}.`);
		configV4.system.logLevel = logLevel;
		cli.action.stop();
	}

	if (configV3.transactionPool) {
		if (configV3.transactionPool.maxTransactions) {
			cli.action.start(
				`Migrating config property 'transactionPool' maxTransactions to: ${configV3.transactionPool.maxTransactions}.`,
			);
			((configV4.transactionPool
				.maxTransactions as unknown) as number) = configV3.transactionPool.maxTransactions;
			cli.action.stop();
		}

		if (configV3.transactionPool.maxTransactionsPerAccount) {
			cli.action.start(
				`Migrating config property 'transactionPool' maxTransactionsPerAccount to: ${configV3.transactionPool.maxTransactionsPerAccount}.`,
			);
			((configV4.transactionPool
				.maxTransactionsPerAccount as unknown) as number) = configV3.transactionPool.maxTransactionsPerAccount;
			cli.action.stop();
		}

		if (configV3.transactionPool.transactionExpiryTime) {
			cli.action.start(
				`Migrating config property 'transactionPool' transactionExpiryTime to: ${configV3.transactionPool.transactionExpiryTime}.`,
			);
			((configV4.transactionPool
				.transactionExpiryTime as unknown) as number) = configV3.transactionPool.transactionExpiryTime;
			cli.action.stop();
		}

		if (configV3.transactionPool.minEntranceFeePriority) {
			cli.action.start(
				`Migrating config property 'transactionPool' minEntranceFeePriority to: ${configV3.transactionPool.minEntranceFeePriority}.`,
			);
			((configV4.transactionPool
				.minEntranceFeePriority as unknown) as string) = configV3.transactionPool.minEntranceFeePriority;
			cli.action.stop();
		}

		if (configV3.transactionPool.minReplacementFeeDifference) {
			cli.action.start(
				`Migrating config property 'transactionPool' minReplacementFeeDifference to: ${configV3.transactionPool.minReplacementFeeDifference}.`,
			);
			((configV4.transactionPool
				.minReplacementFeeDifference as unknown) as string) = configV3.transactionPool.minReplacementFeeDifference;
			cli.action.stop();
		}
	}

	if (configV3.rpc) {
		cli.action.start(`Migrating config property 'rpc' mode to: ${configV3.rpc.mode}.`);
		configV4.rpc.modes = [configV3.rpc.mode];
		cli.action.stop();
	}

	if (configV3.network) {
		if (configV3.network.port) {
			cli.action.start(`Migrating config property 'network' port to: ${configV3.network.port}.`);
			configV4.network.port = configV3.network.port;
			cli.action.stop();
		}

		if (configV3.network.hostIp) {
			cli.action.start(`Migrating config property 'network' host to: ${configV3.network.hostIp}.`);
			configV4.network.host = configV3.network.hostIp;
			cli.action.stop();
		}

		if (configV3.network.maxOutboundConnections) {
			cli.action.start(
				`Migrating config property 'network' maxOutboundConnections to: ${configV3.network.maxOutboundConnections}.`,
			);
			configV4.network.maxOutboundConnections = configV3.network.maxOutboundConnections;
			cli.action.stop();
		}

		if (configV3.network.maxInboundConnections) {
			cli.action.start(
				`Migrating config property 'network' maxInboundConnections to: ${configV3.network.maxInboundConnections}.`,
			);
			configV4.network.maxInboundConnections = configV3.network.maxInboundConnections;
			cli.action.stop();
		}

		if (configV3.network.wsMaxPayload) {
			cli.action.start(
				`Migrating config property 'network' wsMaxPayload to: ${configV3.network.wsMaxPayload}.`,
			);
			configV4.network.wsMaxPayload = configV3.network.wsMaxPayload;
			cli.action.stop();
		}

		if (configV3.network.advertiseAddress) {
			cli.action.start(
				`Migrating config property 'network' advertiseAddress to: ${configV3.network.advertiseAddress}.`,
			);
			configV4.network.advertiseAddress = configV3.network.advertiseAddress;
			cli.action.stop();
		}
	}

	return configV4;
};

export const validateConfig = async (config: ApplicationConfig): Promise<boolean> => {
	try {
		(await validator.validate(applicationConfigSchema, config)) as unknown;
		return true;
	} catch (_) {
		return false;
	}
};

export const writeConfig = async (config: ApplicationConfig, outputPath: string): Promise<void> => {
	if (!existsSync(outputPath)) {
		mkdirSync(outputPath, { recursive: true });
	}

	writeFileSync(resolve(outputPath, 'config.json'), JSON.stringify(config));
};
