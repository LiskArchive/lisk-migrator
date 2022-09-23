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
export const unregisteredAddressesSchema = {
	$id: '/legacyAccount/unregisteredAddresses',
	type: 'object',
	properties: {
		unregisteredAddresses: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					balance: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
				required: ['address', 'balance'],
			},
		},
	},
	required: ['unregisteredAddresses'],
};

export const accountSchema = {
	$id: '/account/base',
	type: 'object',
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		token: {
			type: 'object',
			properties: {
				balance: {
					fieldNumber: 1,
					dataType: 'uint64',
				},
			},
			fieldNumber: 2,
		},
		sequence: {
			type: 'object',
			properties: {
				nonce: {
					fieldNumber: 1,
					dataType: 'uint64',
				},
			},
			fieldNumber: 3,
		},
		keys: {
			type: 'object',
			properties: {
				numberOfSignatures: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				mandatoryKeys: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 2,
				},
				optionalKeys: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 3,
				},
			},
			fieldNumber: 4,
		},
		dpos: {
			type: 'object',
			properties: {
				delegate: {
					type: 'object',
					fieldNumber: 1,
					properties: {
						username: {
							dataType: 'string',
							fieldNumber: 1,
						},
						pomHeights: {
							type: 'array',
							items: {
								dataType: 'uint32',
							},
							fieldNumber: 2,
						},
						consecutiveMissedBlocks: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
						lastForgedHeight: {
							dataType: 'uint32',
							fieldNumber: 4,
						},
						isBanned: {
							dataType: 'boolean',
							fieldNumber: 5,
						},
						totalVotesReceived: {
							dataType: 'uint64',
							fieldNumber: 6,
						},
					},
					required: [
						'username',
						'pomHeights',
						'consecutiveMissedBlocks',
						'lastForgedHeight',
						'isBanned',
						'totalVotesReceived',
					],
				},
				sentVotes: {
					type: 'array',
					fieldNumber: 2,
					items: {
						type: 'object',
						properties: {
							delegateAddress: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
							amount: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
						},
						required: ['delegateAddress', 'amount'],
					},
				},
				unlocking: {
					type: 'array',
					fieldNumber: 3,
					items: {
						type: 'object',
						properties: {
							delegateAddress: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
							amount: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
							unvoteHeight: {
								dataType: 'uint32',
								fieldNumber: 3,
							},
						},
						required: ['delegateAddress', 'amount', 'unvoteHeight'],
					},
				},
			},
			fieldNumber: 5,
		},
	},
	required: ['address', 'token', 'sequence', 'keys', 'dpos'],
};
