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
import * as fs from 'fs-extra';

import { Application, Block as BlockVersion4 } from 'lisk-framework';
import { Block as BlockVersion3 } from '@liskhq/lisk-chain';

import { createGenesisBlock, writeGenesisBlock } from '../../../src/utils/genesis_block';
import { generateBlocks } from './blocks';
import { genesisAssets } from '../fixtures/genesis_assets';

let block: BlockVersion3;
let app: any;
const snapshotTimeGap = 5000;
const genesisBlockPath = `${process.cwd()}/test/genesisBlock`;

describe('Create/export genesis block', () => {
	beforeAll(async () => {
		app = Application.defaultApplication(
			{
				genesis: { chainID: '04000000' },
				modules: {
					pos: {
						useInvalidBLSKey: true,
					},
				},
			},
			true,
		);
		[block] = generateBlocks({
			startHeight: 16281110,
			numberOfBlocks: 1,
		});
	});

	afterAll(async () => fs.removeSync(genesisBlockPath));

	it('should create genesis block', async () => {
		const genesisBlock: BlockVersion4 = await createGenesisBlock(
			app.app,
			genesisAssets.assets,
			block,
			snapshotTimeGap,
		);

		await writeGenesisBlock(genesisBlock, genesisAssets.assets, genesisBlockPath);
		expect(fs.existsSync(genesisBlockPath)).toBe(true);
		expect(fs.existsSync(`${genesisBlockPath}/genesis_block.json`)).toBe(true);
		expect(fs.existsSync(`${genesisBlockPath}/genesis_block.blob`)).toBe(true);
		expect(fs.existsSync(`${genesisBlockPath}/genesis_block.json.SHA256`)).toBe(true);
		expect(fs.existsSync(`${genesisBlockPath}/genesis_assets.json`)).toBe(true);
		expect(() => genesisBlock.validateGenesis()).not.toThrow();
	});
});
