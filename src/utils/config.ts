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

import { unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { Config } from '../types';

const compiledConfig = 'migrator_compiled_config.json';

export const isBinaryBuild = (corePath: string): boolean => existsSync(join(corePath, '.build'));

export const getConfig = async (corePath: string, customConfigPath?: string): Promise<Config> => {
	const command = [];
	command.push(`cd ${corePath}`);

	if (isBinaryBuild(corePath)) {
		command.push('&& source env.sh');
	}

	command.push('&& node scripts/generate_config.js');

	if (customConfigPath) {
		command.push(`--config ${customConfigPath}`);
	}

	command.push(`> ./${compiledConfig}`);

	const fullCommand = command.join(' ');
	const compiledConfigPath = join(corePath, compiledConfig);

	console.info('Executing command to fetch the configuration');
	console.info(fullCommand);

	// Executing command to compile the configuration
	// 	to use the "source" command on Linux we have to explicity set shell to bash
	execSync(fullCommand, { shell: '/bin/bash' });

	// Loading compiled configuration file
	const config = await import(compiledConfigPath);

	// Deleting compiled configuration file
	unlinkSync(compiledConfigPath);

	return config;
};
