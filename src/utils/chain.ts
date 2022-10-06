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

import cli from 'cli-ux';
import { getClient } from '../client';

let blockID: string;

interface ObserveParams {
	readonly label: string;
	readonly height: number;
	readonly liskCorePath: string;
	readonly delay: number;
	readonly isFinal: boolean;
}

export const getChainHeight = async (liskCorePath: string, isFinal: boolean): Promise<number> => {
	const client = await getClient(liskCorePath);
	const result = await client.node.getNodeInfo();
	const height = isFinal ? result.finalizedHeight : result.height;
	return height;
};

export const setBlockIDAtSnapshotHeight = async (
	liskCorePath: string,
	height: number,
): Promise<string> => {
	const client = await getClient(liskCorePath);
	const result = await client.block.getByHeight(height);
	blockID = result.header.id.toString('hex');
	return blockID;
};

export const getBlockIDAtSnapshotHeight = (): string => blockID;

export const getBlockIDAtSnapshotHeightFinalized = async (
	liskCorePath: string,
	height: number,
): Promise<string> => {
	const client = await getClient(liskCorePath);
	const result = await client.block.getByHeight(height);
	blockID = result.header.id.toString('hex');
	return blockID;
};

const secondsToHumanString = (seconds: number): string => {
	const years = Math.floor(seconds / 31536000);
	const days = Math.floor((seconds % 31536000) / 86400);
	const hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	const minutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	const numSeconds = (((seconds % 31536000) % 86400) % 3600) % 60;

	const result = [];

	if (years > 0) {
		result.push(`${years}y`);
	}

	if (days > 0) {
		result.push(`${days}d`);
	}

	if (hours > 0) {
		result.push(`${hours}h`);
	}

	if (minutes > 0) {
		result.push(`${minutes}m`);
	}

	if (numSeconds > 0) {
		result.push(`${numSeconds}s`);
	}

	if (result.length === 0) {
		return '0';
	}

	return result.join(' ');
};

const getRemainingTime = (currentHeight: number, observedHeight: number): string =>
	secondsToHumanString((observedHeight - currentHeight) * 10);

export const observeChainHeight = async (options: ObserveParams): Promise<number> => {
	const observedHeight = options.height;
	const startHeight = await getChainHeight(options.liskCorePath, options.isFinal);

	if (startHeight === observedHeight) {
		return startHeight;
	}

	if (startHeight > observedHeight) {
		throw new Error(`Chain height: ${startHeight} crossed the observed height: ${observedHeight}`);
	}

	const progress = cli.progress({
		format: `${options.label}: [{bar}] {percentage}% | Remaining: {remaining}/{total} | Height: {height}/${observedHeight} | ETA: {timeLeft}`,
		fps: 2,
		synchronousUpdate: false,
		etaAsynchronousUpdate: false,
		barsize: 30,
	});

	progress.start(observedHeight - startHeight, 0, {
		timeLeft: getRemainingTime(startHeight, observedHeight),
		remaining: observedHeight - startHeight,
		height: startHeight,
	});

	await new Promise((resolve, reject) => {
		let intervalId: NodeJS.Timer;

		// eslint-disable-next-line consistent-return
		const checkHeight = async () => {
			let height!: number;
			try {
				height = await getChainHeight(options.liskCorePath, options.isFinal);
			} catch (error) {
				return reject(error);
			}

			progress.update(height - startHeight, {
				timeLeft: getRemainingTime(height, observedHeight),
				remaining: observedHeight - height,
				height,
			});

			if (height === observedHeight) {
				clearInterval(intervalId);
				return resolve(height);
			}

			if (height > observedHeight) {
				return reject(
					new Error(`Chain height: ${height} crossed the observed height: ${observedHeight}`),
				);
			}
		};

		intervalId = setInterval(checkHeight, options.delay);
	});

	progress.stop();

	return observedHeight;
};
