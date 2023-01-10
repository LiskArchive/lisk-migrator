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
import * as fs from 'fs-extra';
import { resolve } from 'path';
import { codec, Schema } from '@liskhq/lisk-codec';
import { GenesisBlockGenerateInput } from '../types';

export const createGenesisBlock = async (
	app: any,
	assets: any,
): Promise<GenesisBlockGenerateInput> => {
	const genesisBlock = await app.generateGenesisBlock({
		assets: assets.map((a: { module: any; schema: Schema; data: object }) => ({
			module: a.module,
			data: codec.fromJSON(a.schema, a.data),
			schema: a.schema,
		})),
		chainID: Buffer.from(app.config.genesis.chainID, 'hex'),
	});

	return genesisBlock;
};

export const writeGenesisBlock = async (
	genesisBlock: GenesisBlockGenerateInput,
	outputPath: string,
): Promise<any> => {
	if (fs.existsSync(outputPath)) {
		fs.unlinkSync(outputPath);
	}

	fs.mkdirSync(outputPath, { recursive: true });
	fs.writeFileSync(
		resolve(outputPath, 'genesis_block.json'),
		JSON.stringify(genesisBlock, null, '\t'),
	);
	fs.writeFileSync(resolve(outputPath, 'genesis_block.blob'), genesisBlock.getBytes());
};
