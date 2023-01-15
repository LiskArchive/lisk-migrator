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
import path from 'path';
import debugInit from 'debug';
import cli from 'cli-ux';
import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { Config } from '../types';
import { NETWORK_CONSTANT } from '../constants';

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
	const configFilePath = path.resolve(process.cwd(), `config/${network}/config.json`);
	return configFilePath;
};

// TODO: Implement with the issue https://github.com/LiskHQ/lisk-migrator/issues/55
export const migrateUserConfig = async (): Promise<any> => true;
