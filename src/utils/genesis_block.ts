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
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import path from 'path';
import { Block as BlockVersion3 } from '@liskhq/lisk-chain';
import { Block as BlockVersion4 } from 'lisk-framework';
import { codec, Schema } from '@liskhq/lisk-codec';
import { GenesisAssetEntry } from '../types';
import { SNAPSHOT_BLOCK_VERSION, SNAPSHOT_TIME_GAP } from '../constants';

export const createChecksum = async (filePath: string): Promise<string> => {
	const fileStream = fs.createReadStream(filePath);
	const dataHash = crypto.createHash('sha256');
	const fileHash = await new Promise<Buffer>((resolve, reject) => {
		fileStream.on('data', (datum: Buffer) => {
			dataHash.update(datum);
		});
		fileStream.on('error', error => {
			reject(error);
		});
		fileStream.on('end', () => {
			resolve(dataHash.digest());
		});
	});

	return fileHash.toString('hex');
};

export const createGenesisBlock = async (
	// TODO: Update type any once GenesisBlockGenerateInput exported by SDK
	app: any,
	assets: GenesisAssetEntry[],
	blockAtSnapshotHeight: BlockVersion3,
): Promise<BlockVersion4> => {
	const input = {
		assets: assets.map((a: { module: string; schema: Schema; data: object }) => ({
			module: a.module,
			data: codec.fromJSON(a.schema, a.data),
			schema: a.schema,
		})),
		chainID: Buffer.from(app.config.genesis.chainID, 'hex'),
		timestamp: blockAtSnapshotHeight.header.timestamp + SNAPSHOT_TIME_GAP,
		height: blockAtSnapshotHeight.header.height + 1,
		previousBlockID: blockAtSnapshotHeight.header.previousBlockID,
	};

	const genesisBlock = await app.generateGenesisBlock(input);
	genesisBlock.header.version = SNAPSHOT_BLOCK_VERSION;
	return genesisBlock;
};

export const writeGenesisBlock = async (
	genesisBlock: BlockVersion4,
	outputPath: string,
): Promise<void> => {
	if (fs.existsSync(outputPath)) {
		fs.unlinkSync(outputPath);
	}

	fs.mkdirSync(outputPath, { recursive: true });
	fs.writeFileSync(
		path.resolve(outputPath, 'genesis_block.json'),
		JSON.stringify(genesisBlock, null, '\t'),
	);
	fs.writeFileSync(path.resolve(outputPath, 'genesis_block.blob'), genesisBlock.getBytes());

	const genesisBlockHash = await createChecksum(path.resolve(outputPath, 'genesis_block.json'));
	fs.writeFileSync(path.resolve(outputPath, 'genesis_block.json.SHA256'), genesisBlockHash);
};
