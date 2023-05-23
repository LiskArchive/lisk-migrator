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
import { existsSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { validator } from '@liskhq/lisk-validator';

import { ApplicationConfig, applicationConfigSchema } from 'lisk-framework';
import { ConfigV3, Logger } from '../types';
import { NETWORK_CONSTANT } from '../constants';

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
	configv3: ConfigV3,
	configV4: ApplicationConfig,
): Promise<ApplicationConfig> => {
	if (configv3.rootPath) {
		cli.action.start(`Migrating config property 'dataPath' to ${configv3.rootPath}.`);
		configV4.system.dataPath = configv3.rootPath;
		cli.action.stop();
	}

	if (configv3.logger) {
		const logLevel = getLogLevel(configv3.logger);
		cli.action.start(`Migrating config property 'logLevel' to ${logLevel}.`);
		configV4.system.logLevel = logLevel;
		cli.action.stop();
	}

	if (configv3.transactionPool) {
		cli.action.start("Migrating config property 'transactionPool'.");
		configV4.transactionPool = configv3.transactionPool;
		cli.action.stop();
	}

	if (configv3.rpc) {
		cli.action.start(`Migrating config property 'rpc' mode to ${configv3.rpc.mode}.`);
		configV4.rpc.modes = [configv3.rpc.mode];
		cli.action.stop();
	}

	if (configv3.network) {
		if (configv3.network.port) {
			cli.action.start(`Migrating config property 'network' port to ${configv3.network.port}.`);
			configV4.network.port = configv3.network.port;
			cli.action.stop();
		}

		if (configv3.network.hostIp) {
			cli.action.start(`Migrating config property 'network' host to ${configv3.network.hostIp}.`);
			configV4.network.host = configv3.network.hostIp;
			cli.action.stop();
		}

		if (configv3.network.maxOutboundConnections) {
			cli.action.start(
				`Migrating config property 'network' maxOutboundConnections to ${configv3.network.maxOutboundConnections}.`,
			);
			configV4.network.maxOutboundConnections = configv3.network.maxOutboundConnections;
			cli.action.stop();
		}

		if (configv3.network.maxInboundConnections) {
			cli.action.start(
				`Migrating config property 'network' maxInboundConnections to ${configv3.network.maxInboundConnections}.`,
			);
			configV4.network.maxInboundConnections = configv3.network.maxInboundConnections;
			cli.action.stop();
		}

		if (configv3.network.wsMaxPayload) {
			cli.action.start(
				`Migrating config property 'network' wsMaxPayload to ${configv3.network.wsMaxPayload}.`,
			);
			configV4.network.wsMaxPayload = configv3.network.wsMaxPayload;
			cli.action.stop();
		}

		if (configv3.network.advertiseAddress) {
			cli.action.start(
				`Migrating config property 'network' advertiseAddress to ${configv3.network.advertiseAddress}.`,
			);
			configV4.network.advertiseAddress = configv3.network.advertiseAddress;
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
	if (existsSync(outputPath)) {
		unlinkSync(outputPath);
	}

	mkdirSync(outputPath, { recursive: true });

	writeFileSync(resolve(outputPath, 'config.json'), JSON.stringify(config));
};
