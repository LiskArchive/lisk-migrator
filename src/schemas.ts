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
