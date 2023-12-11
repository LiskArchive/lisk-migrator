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
import Command from '@oclif/command';

import { read, write, exists } from './fs';
import { FILE_NAME } from '../constants';
import { NetworkConfigLocal } from '../types';

export const getCommandsToExecPostMigration = async (
	networkConstant: NetworkConfigLocal,
	snapshotHeight: number,
	outputDir: string,
) => {
	const commandsToExecute = [];

	const forgingStatusJsonFilepath = resolve(outputDir, FILE_NAME.FORGING_STATUS);
	if (await exists(forgingStatusJsonFilepath)) {
		const forgingStatusString = (await read(forgingStatusJsonFilepath)) as string;
		const forgingStatusJson = JSON.parse(forgingStatusString);

		const chainID = parseInt(networkConstant.tokenID.substring(0, 2), 16);

		for (const forgingStatus of forgingStatusJson) {
			commandsToExecute.push(
				'\n',
				`## Generate/Register the BLS keys for validator ${forgingStatus.lskAddress} - Please modify the command if necessary`,
				'\n',
			);

			const keysFilepath = resolve(outputDir, FILE_NAME.KEYS);
			commandsToExecute.push(
				`lisk-core keys:create --chainid ${chainID} --output ${keysFilepath} --add-legacy`,
				`lisk-core keys:import --file-path ${keysFilepath}`,
				`lisk-core endpoint:invoke random_setHashOnion '{ "address":"${forgingStatus.lskAddress}"}'`,
				`lisk-core endpoint:invoke generator_setStatus '{ "address":"${
					forgingStatus.lskAddress
				}", "height": ${forgingStatus.height ?? snapshotHeight}, "maxHeightGenerated":  ${
					forgingStatus.maxHeightPreviouslyForged ?? snapshotHeight
				}, "maxHeightPrevoted":  ${forgingStatus.maxHeightPrevoted ?? snapshotHeight} }' --pretty`,
				`lisk-core generator:enable ${forgingStatus.lskAddress} --use-status-value`,
				'lisk-core transaction:create legacy registerKeys 400000 --key-derivation-path=legacy --send',
			);

			commandsToExecute.push('\n', '-----------------------------------------------------', '\n');
		}
	}

	return commandsToExecute;
};

export const writeCommandsToExec = async (
	_this: Command,
	networkConstant: NetworkConfigLocal,
	snapshotHeight: number,
	outputDir: string,
	preCompletionCommands?: string[],
) => {
	const commandsToExecPreCompletion = preCompletionCommands ?? [];
	const commandsToExecPostMigration = await getCommandsToExecPostMigration(
		networkConstant,
		snapshotHeight,
		outputDir,
	);

	const allCommandsToExec = [
		'## Please execute the following commands to finish the migration successfully:',
		'------------------------------------------------------------------------------',
		'\n',
		...commandsToExecPreCompletion,
		...commandsToExecPostMigration,
	].join('\n');

	// Create the document only when there are commands to be executed by the user
	if (commandsToExecPostMigration.length || commandsToExecPreCompletion.length) {
		const commandsToExecuteFilepath = resolve(outputDir, FILE_NAME.COMMANDS_TO_EXEC);

		_this.log(
			commandsToExecPreCompletion.length
				? `Creating file with the list of commands to execute post migration: ${commandsToExecuteFilepath}`
				: `Creating file with the list of commands to execute: ${commandsToExecuteFilepath}`,
		);

		await write(commandsToExecuteFilepath, allCommandsToExec);

		_this.log(
			commandsToExecPreCompletion.length
				? `Successfully created file with the list of commands to execute post migration: ${commandsToExecuteFilepath}`
				: `Successfully created file with the list of commands to execute: ${commandsToExecuteFilepath}`,
		);
	}
};
