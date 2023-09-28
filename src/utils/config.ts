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
import * as fs from 'fs-extra';
import cli from 'cli-ux';
import { Command } from '@oclif/command';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { validator } from '@liskhq/lisk-validator';
import { ApplicationConfig, applicationConfigSchema } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import { ApplicationConfigV3, LoggerConfig } from '../types';
import {
	DEFAULT_VERSION,
	MAX_BFT_WEIGHT_CAP,
	NETWORK_CONSTANT,
	NUMBER_ACTIVE_VALIDATORS,
	NUMBER_STANDBY_VALIDATORS,
	POS_INIT_ROUNDS,
} from '../constants';
import { resolveAbsolutePath } from './fs';

export const NETWORKS = Object.freeze([
	{
		name: 'mainnet',
		networkID: '4c09e6a781fc4c7bdb936ee815de8f94190f8a7519becd9de2081832be309a99',
	},
	{
		name: 'testnet',
		networkID: '15f0dacc1060e91818224a94286b13aa04279c640bd5d6f193182031d133df7c',
	},
]);

const LOG_LEVEL_PRIORITY = Object.freeze({
	FATAL: 0,
	ERROR: 1,
	WARN: 2,
	INFO: 3,
	DEBUG: 4,
	TRACE: 5,
}) as Record<string, number>;

export const getNetworkByNetworkID = (_networkID: string): string | Error => {
	const networkInfo = NETWORKS.find(info => info.networkID === _networkID);
	if (!networkInfo) throw new Error('Migrator running against unsupported network.');
	return networkInfo.name;
};

export const getLogLevel = (loggerConfig: LoggerConfig): string => {
	const highestLogPriority = Math.max(
		LOG_LEVEL_PRIORITY[String(loggerConfig.fileLogLevel).toUpperCase()],
		LOG_LEVEL_PRIORITY[String(loggerConfig.consoleLogLevel).toUpperCase()],
	);

	try {
		const [logLevel] = Object.entries(LOG_LEVEL_PRIORITY).find(
			([, v]) => v === highestLogPriority,
		) as [string, number];

		return logLevel.toLowerCase();
	} catch (err) {
		return 'info';
	}
};

export const getConfig = async (
	_this: Command,
	corePath: string,
	_networkID: string,
	customConfigPath?: string,
): Promise<ApplicationConfigV3> => {
	let network: String | Error = 'mainnet';
	try {
		network = getNetworkByNetworkID(_networkID);
	} catch (err) {
		_this.error(err as Error);
	}

	const dataDirConfigPath = join(corePath, 'config', network as string, 'config.json');
	const dataDirConfig = await fs.readJSON(dataDirConfigPath);

	const customConfig = customConfigPath
		? await fs.readJSON(resolveAbsolutePath(customConfigPath))
		: {};

	cli.action.start('Compiling Lisk Core configuration');
	const config = objects.mergeDeep({}, dataDirConfig, customConfig) as ApplicationConfigV3;
	cli.action.stop();

	return config;
};

export const resolveConfigPathByNetworkID = async (networkIdentifier: string): Promise<string> => {
	const network = NETWORK_CONSTANT[networkIdentifier].name;
	const configFilePath = join(__dirname, '../..', `config/${network}/config.json`);
	return configFilePath;
};

export const createBackup = async (config: ApplicationConfigV3): Promise<void> => {
	const backupPath = join(__dirname, '../..', 'backup');
	mkdirSync(backupPath, { recursive: true });
	writeFileSync(resolve(`${backupPath}/config.json`), JSON.stringify(config, null, '\t'));
};

export const migrateUserConfig = async (
	configV3: ApplicationConfigV3,
	configV4: ApplicationConfig,
	snapshotHeight: number,
): Promise<ApplicationConfig> => {
	cli.action.start('Starting migration of custom config properties.');

	// Assign default version if not available
	if (!configV4?.system?.version) {
		cli.action.start(`Setting config property 'system.version' to: ${DEFAULT_VERSION}.`);
		configV4.system.version = DEFAULT_VERSION;
		cli.action.stop();
	}

	if (configV3?.rootPath) {
		cli.action.start(`Setting config property 'system.dataPath' to: ${configV3.rootPath}.`);
		configV4.system.dataPath = configV3.rootPath;
		cli.action.stop();
	}

	if (configV3?.logger) {
		const logLevel = getLogLevel(configV3.logger);
		cli.action.start(`Setting config property 'system.logLevel' to: ${logLevel}.`);
		configV4.system.logLevel = logLevel;
		cli.action.stop();
	}

	if (configV3?.transactionPool) {
		if (configV3?.transactionPool?.maxTransactions) {
			cli.action.start(
				`Setting config property 'transactionPool.maxTransactions' to: ${configV3.transactionPool.maxTransactions}.`,
			);
			((configV4.transactionPool
				.maxTransactions as unknown) as number) = configV3.transactionPool.maxTransactions;
			cli.action.stop();
		}

		if (configV3?.transactionPool?.maxTransactionsPerAccount) {
			cli.action.start(
				`Setting config property 'transactionPool.maxTransactionsPerAccount' to: ${configV3.transactionPool.maxTransactionsPerAccount}.`,
			);
			((configV4.transactionPool
				.maxTransactionsPerAccount as unknown) as number) = configV3.transactionPool.maxTransactionsPerAccount;
			cli.action.stop();
		}

		if (configV3?.transactionPool?.transactionExpiryTime) {
			cli.action.start(
				`Setting config property 'transactionPool.transactionExpiryTime' to: ${configV3.transactionPool.transactionExpiryTime}.`,
			);
			((configV4.transactionPool
				.transactionExpiryTime as unknown) as number) = configV3.transactionPool.transactionExpiryTime;
			cli.action.stop();
		}

		if (configV3?.transactionPool?.minEntranceFeePriority) {
			cli.action.start(
				`Setting config property 'transactionPool.minEntranceFeePriority' to: ${configV3.transactionPool.minEntranceFeePriority}.`,
			);
			((configV4.transactionPool
				.minEntranceFeePriority as unknown) as string) = configV3.transactionPool.minEntranceFeePriority;
			cli.action.stop();
		}

		if (configV3?.transactionPool?.minReplacementFeeDifference) {
			cli.action.start(
				`Setting config property 'transactionPool.minReplacementFeeDifference' to: ${configV3.transactionPool.minReplacementFeeDifference}.`,
			);
			((configV4.transactionPool
				.minReplacementFeeDifference as unknown) as string) = configV3.transactionPool.minReplacementFeeDifference;
			cli.action.stop();
		}
	}

	if (configV3?.rpc?.mode) {
		cli.action.start(`Setting config property 'rpc.modes' to: ${configV3.rpc.mode}.`);
		configV4.rpc.modes = [configV3.rpc.mode];
		cli.action.stop();
	}

	if (configV3?.network) {
		if (configV3?.network?.port) {
			cli.action.start(`Setting config property 'network.port' to: ${configV3.network.port}.`);
			configV4.network.port = configV3.network.port;
			cli.action.stop();
		}

		if (configV3?.network?.hostIp) {
			cli.action.start(`Setting config property 'network.host' to: ${configV3.network.hostIp}.`);
			configV4.network.host = configV3.network.hostIp;
			cli.action.stop();
		}

		if (configV3?.network?.maxOutboundConnections) {
			cli.action.start(
				`Setting config property 'network.maxOutboundConnections' to: ${configV3.network.maxOutboundConnections}.`,
			);
			configV4.network.maxOutboundConnections = configV3.network.maxOutboundConnections;
			cli.action.stop();
		}

		if (configV3?.network?.maxInboundConnections) {
			cli.action.start(
				`Setting config property 'network.maxInboundConnections' to: ${configV3.network.maxInboundConnections}.`,
			);
			configV4.network.maxInboundConnections = configV3.network.maxInboundConnections;
			cli.action.stop();
		}

		if (configV3?.network?.wsMaxPayload) {
			cli.action.start(
				`Setting config property 'network.wsMaxPayload' to: ${configV3.network.wsMaxPayload}.`,
			);
			configV4.network.wsMaxPayload = configV3.network.wsMaxPayload;
			cli.action.stop();
		}

		if (configV3?.network?.advertiseAddress) {
			cli.action.start(
				`Setting config property 'network.advertiseAddress' to: ${configV3.network.advertiseAddress}.`,
			);
			configV4.network.advertiseAddress = configV3.network.advertiseAddress;
			cli.action.stop();
		}
	}

	cli.action.start("Calculating and updating config property 'genesis.minimumCertifyHeight'.");
	configV4.genesis.minimumCertifyHeight =
		snapshotHeight +
		1 +
		(POS_INIT_ROUNDS + NUMBER_ACTIVE_VALIDATORS - 1) *
			(NUMBER_ACTIVE_VALIDATORS + NUMBER_STANDBY_VALIDATORS);
	cli.action.stop();

	if (configV4?.modules?.pos && !configV4?.modules?.pos?.maxBFTWeightCap) {
		cli.action.start(
			`Setting config property 'modules.pos.maxBFTWeightCap' to: ${MAX_BFT_WEIGHT_CAP}.`,
		);
		configV4.modules.pos.maxBFTWeightCap = MAX_BFT_WEIGHT_CAP;
		cli.action.stop();
	}

	cli.action.stop();

	return configV4;
};

export const validateConfig = async (config: ApplicationConfig): Promise<boolean> => {
	try {
		const mergedConfig = objects.mergeDeep({}, applicationConfigSchema.default, config);
		(await validator.validate(applicationConfigSchema, mergedConfig)) as unknown;
		return true;
	} catch (error) {
		return false;
	}
};

export const writeConfig = async (config: ApplicationConfig, outputDir: string): Promise<void> => {
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	writeFileSync(resolve(outputDir, 'config.json'), JSON.stringify(config));
};
