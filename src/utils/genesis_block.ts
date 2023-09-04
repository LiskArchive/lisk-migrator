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
import { GenesisAssetEntry } from '../types';
import { execAsync } from './process';

(BigInt.prototype as any).toJSON = function () {
	return this.toString();
};
(Buffer.prototype as any).toJSON = function () {
	return this.toString('hex');
};

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
	network: string,
	config: string,
	output: string,
	blockAtSnapshotHeight: BlockVersion3,
	snapshotTimeGap: number,
) => {
	const timestamp = blockAtSnapshotHeight.header.timestamp + snapshotTimeGap;
	const height = blockAtSnapshotHeight.header.height + 1;
	const previousBlockID = blockAtSnapshotHeight.header.previousBlockID.toString('hex');
	const genesisBlockCreateCommand = `lisk-core genesis-block:create --network ${network} --config=${config} --output=${output} --assets-file=${output}/genesis_assets.json --height=${height} --previous-block-id=${previousBlockID} --timestamp=${timestamp}`;
	await execAsync(genesisBlockCreateCommand);
};

export const writeGenesisAssets = async (
	genesisAssets: GenesisAssetEntry[],
	outputPath: string,
): Promise<void> => {
	if (fs.existsSync(outputPath)) fs.rmdirSync(outputPath, { recursive: true });
	fs.mkdirSync(outputPath, { recursive: true });

	const genesisAssetsJsonFilepath = path.resolve(outputPath, 'genesis_assets.json');
	fs.writeFileSync(
		genesisAssetsJsonFilepath,
		JSON.stringify({ assets: genesisAssets }, null, '\t'),
	);
};
