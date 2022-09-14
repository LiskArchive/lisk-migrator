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
import { unlinkSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { Config } from '../types';

const debug = debugInit('lisk:migrator');

const compiledConfig = 'migrator_compiled_config.json';

export const isBinaryBuild = (corePath: string): boolean => existsSync(join(corePath, '.build'));

export const getConfig = async (corePath: string, customConfigPath?: string): Promise<Config> => {
	const command = [];

	const [network] = readdirSync(`${corePath}/config`);
	debug(network);

	cli.action.start('Creating configuration for migrator');
	// Executing command to copy config file to corePath
	execSync(`cd ${corePath}/config/${network} && cp config.json ${corePath}/${compiledConfig}`, {
		shell: '/bin/bash',
	});
	cli.action.stop();

	command.push(`cd ${corePath}`);

	if (isBinaryBuild(corePath)) {
		command.push('&& source env.sh');
	}

	if (customConfigPath) {
		command.push(`--config ${customConfigPath}`);
	}

	command.push(`> ./${compiledConfig}`);

	const fullCommand = command.join(' ');
	const compiledConfigPath = join(corePath, compiledConfig);

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

	// Deleting compiled configuration file
	unlinkSync(compiledConfigPath);

	return config;
};

// TODO: Implement with the issue https://github.com/LiskHQ/lisk-migrator/issues/55
export const migrateConfig = async (): Promise<any> => true;
