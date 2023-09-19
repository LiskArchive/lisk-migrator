/*
 * Copyright © 2022 Lisk Foundation
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
import { resolve } from 'path';
import { createIPCClient, APIClient } from '@liskhq/lisk-api-client';
import { Block } from '@liskhq/lisk-chain';
import { NEW_BLOCK_EVENT_NAME } from './constants';
import { write } from './utils/fs';

export const getAPIClient = async (liskCorePath: string): Promise<APIClient> => {
	const client = await createIPCClient(liskCorePath);
	return client;
};

export const subscribeToNewBlockEvent = (
	client: APIClient,
	snapshotHeight: number,
	outputDir: string,
) => {
	client.subscribe(NEW_BLOCK_EVENT_NAME, async data => {
		const { block: encodedBlock } = (data as unknown) as Record<string, string>;
		const newBlock = client.block.decode(Buffer.from(encodedBlock, 'hex')) as Block;
		if (newBlock.header.height === snapshotHeight) {
			const forgingStatus = await client.invoke('app:getForgingStatus');
			const forgingStatusJsonFilepath = resolve(outputDir, 'forgingStatus.json');
			await write(forgingStatusJsonFilepath, JSON.stringify(forgingStatus));
		}
	});
};
