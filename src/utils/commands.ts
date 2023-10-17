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
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { resolve } from 'path';
import { read } from './fs';

export const getCommandsToExecute = async (outputDir: string) => {
	const commandsToExecute = {
		keys: [] as string[],
		hashOnion: [] as string[],
		generator: [] as string[],
		validator: [] as string[],
	};

	commandsToExecute.keys.push(
		'lisk-core keys:create --chainid 0 --output ./config/keys.json --add-legacy',
	);
	commandsToExecute.keys.push('lisk-core keys:import --file-path config/keys.json');

	const forgingStatusJsonFilepath = resolve(outputDir, 'forgingStatus.json');
	const forgingStatusString = (await read(forgingStatusJsonFilepath)) as string;
	const forgingStatusJson = JSON.parse(forgingStatusString);

	for (const forgingStatus of forgingStatusJson) {
		commandsToExecute.hashOnion.push(
			`lisk-core endpoint:invoke random_setHashOnion '{"address":${forgingStatus.lskAddress}}'`,
		);

		commandsToExecute.generator.push(
			`lisk-core endpoint:invoke generator_setStatus '{ "address": ${forgingStatus.lskAddress}, "height": ${forgingStatus.height}, "maxHeightGenerated":  ${forgingStatus.maxHeightPreviouslyForged}, "maxHeightPrevoted":  ${forgingStatus.maxHeightPrevoted} }' --pretty`,
		);

		commandsToExecute.generator.push(
			`lisk-core generator:enable ${forgingStatus.lskAddress} --use-status-value`,
		);
	}

	commandsToExecute.validator.push(
		'lisk-core transaction:create legacy registerKeys 10000000 --key-derivation-path=legacy --send',
	);

	return commandsToExecute;
};
