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
import {
	TOKEN_ID_LENGTH,
	DEFAULT_HOST,
	DEFAULT_PORT_P2P,
	DEFAULT_PORT_RPC,
	SHA_256_HASH_LENGTH,
	MAX_NUM_VALIDATORS,
	BLS_PUBLIC_KEY_LENGTH,
	CHAIN_ID_LENGTH,
} from './constants';

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

export const signingBlockHeaderSchema = {
	$id: '/block/header/signing',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
		generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: { dataType: 'bytes', fieldNumber: 8 },
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'transactionRoot',
		'generatorPublicKey',
		'reward',
		'asset',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: '/block/header',
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

export declare const transactionSchema: {
	$id: string;
	type: string;
	required: string[];
	properties: {
		moduleID: {
			dataType: string;
			fieldNumber: number;
			minimum: number;
		};
		assetID: {
			dataType: string;
			fieldNumber: number;
		};
		nonce: {
			dataType: string;
			fieldNumber: number;
		};
		fee: {
			dataType: string;
			fieldNumber: number;
		};
		senderPublicKey: {
			dataType: string;
			fieldNumber: number;
			minLength: number;
			maxLength: number;
		};
		asset: {
			dataType: string;
			fieldNumber: number;
		};
		signatures: {
			type: string;
			items: {
				dataType: string;
			};
			fieldNumber: number;
		};
	};
};

export const voteWeightsSchema = {
	$id: '/dpos/voteWeights',
	type: 'object',
	properties: {
		voteWeights: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					round: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					delegates: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							properties: {
								address: {
									dataType: 'bytes',
									fieldNumber: 1,
								},
								voteWeight: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
	},
	required: ['voteWeights'],
};

export const genesisLegacyStoreSchema = {
	$id: '/legacy/module/genesis',
	type: 'object',
	required: ['accounts'],
	properties: {
		accounts: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'balance'],
				properties: {
					address: {
						dataType: 'bytes',
						minLength: 8,
						maxLength: 8,
						fieldNumber: 1,
					},
					balance: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const genesisAuthStoreSchema = {
	$id: '/auth/module/genesis',
	type: 'object',
	required: ['authDataSubstore'],
	properties: {
		authDataSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						format: 'lisk32',
						fieldNumber: 1,
					},
					storeValue: {
						type: 'object',
						fieldNumber: 2,
						required: ['nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
						properties: {
							nonce: {
								dataType: 'uint64',
								fieldNumber: 1,
							},
							numberOfSignatures: {
								dataType: 'uint32',
								fieldNumber: 2,
							},
							mandatoryKeys: {
								type: 'array',
								fieldNumber: 3,
								items: {
									dataType: 'bytes',
								},
							},
							optionalKeys: {
								type: 'array',
								fieldNumber: 4,
								items: {
									dataType: 'bytes',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const applicationConfigSchema = {
	$id: '#/config',
	type: 'object',
	required: ['system', 'rpc', 'network', 'modules', 'plugins', 'genesis'],
	properties: {
		system: {
			type: 'object',
			required: ['version', 'dataPath', 'logLevel', 'keepEventsForHeights'],
			properties: {
				version: {
					type: 'string',
					format: 'version',
				},
				dataPath: {
					type: 'string',
				},
				logLevel: {
					type: 'string',
					enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
				},
				keepEventsForHeights: {
					type: 'integer',
				},
			},
		},
		rpc: {
			type: 'object',
			required: ['modes', 'host', 'port'],
			properties: {
				modes: {
					type: 'array',
					items: { type: 'string', enum: ['ipc', 'ws', 'http'] },
					uniqueItems: true,
				},
				host: { type: 'string' },
				port: { type: 'number', minimum: 1024, maximum: 65535 },
			},
		},
		legacy: {
			type: 'object',
			required: ['brackets'],
			properties: {
				sync: { type: 'boolean' },
				brackets: {
					type: 'array',
					items: {
						type: 'object',
						required: ['startHeight', 'snapshotHeight', 'snapshotBlockID'],
						properties: {
							startHeight: { type: 'number', minimum: 0 },
							snapshotHeight: { type: 'number', minimum: 0 },
							snapshotBlockID: { type: 'string', format: 'hex' },
						},
					},
				},
			},
		},
		network: {
			type: 'object',
			properties: {
				version: {
					type: 'string',
					format: 'networkVersion',
				},
				port: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
				},
				host: {
					type: 'string',
					format: 'ip',
				},
				seedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ipOrFQDN',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
				},
				blacklistedIPs: {
					type: 'array',
					items: {
						type: 'string',
						format: 'ip',
					},
				},
				// Warning! The connectivity of the node might be negatively impacted if using this option.
				fixedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ip',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
					maximum: 4,
				},
				// Warning! Beware of declaring only trustworthy peers in this array as these could attack a
				// node with a denial-of-service attack because the banning mechanism is deactivated.
				whitelistedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ip',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
				},
				maxOutboundConnections: {
					type: 'integer',
				},
				maxInboundConnections: {
					type: 'integer',
				},
				wsMaxPayload: {
					type: 'integer',
					maximum: 3048576,
				},
				advertiseAddress: {
					type: 'boolean',
				},
			},
			required: ['seedPeers'],
		},
		transactionPool: {
			type: 'object',
			properties: {
				maxTransactions: {
					type: 'integer',
					minimum: 1,
				},
				maxTransactionsPerAccount: {
					type: 'integer',
					minimum: 1,
				},
				transactionExpiryTime: {
					type: 'integer',
					minimum: 60 * 1000,
				},
				minEntranceFeePriority: {
					type: 'string',
					format: 'uint64',
				},
				minReplacementFeeDifference: {
					type: 'string',
					format: 'uint64',
				},
			},
		},
		genesis: {
			type: 'object',
			required: ['block', 'blockTime', 'bftBatchSize', 'chainID', 'maxTransactionsSize'],
			properties: {
				block: {
					type: 'object',
					oneOf: [
						{
							required: ['fromFile'],
							properties: {
								fromFile: {
									type: 'string',
								},
								blob: {
									type: 'string',
									format: 'hex',
								},
							},
						},
						{
							required: ['blob'],
							properties: {
								fromFile: {
									type: 'string',
								},
								blob: {
									type: 'string',
									format: 'hex',
								},
							},
						},
					],
				},
				blockTime: {
					type: 'number',
					minimum: 2,
					description: 'Slot time interval in seconds',
				},
				bftBatchSize: {
					type: 'number',
					minimum: 1,
					description: 'The length of a round',
				},
				chainID: {
					type: 'string',
					format: 'hex',
					description: 'The unique name of the chain as a string encoded in Hex format',
				},
				maxTransactionsSize: {
					type: 'integer',
					minimum: 10 * 1024, // Kilo Bytes
					maximum: 30 * 1024, // Kilo Bytes
					description: 'Maximum number of transactions allowed per block',
				},
			},
			additionalProperties: false,
		},
		generator: {
			type: 'object',
			required: ['keys'],
			properties: {
				keys: {
					type: 'object',
					properties: {
						fromFile: {
							type: 'string',
							description: 'Path to a file which stores keys',
						},
					},
				},
			},
		},
		modules: {
			type: 'object',
			propertyNames: {
				pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
			},
			additionalProperties: { type: 'object' },
		},
		plugins: {
			type: 'object',
		},
	},
	additionalProperties: false,
	default: {
		system: {
			dataPath: '~/.lisk/beta-sdk-app',
			version: '0.1.0',
			keepEventsForHeights: 300,
			logLevel: 'info',
		},
		rpc: {
			modes: ['ipc'],
			port: DEFAULT_PORT_RPC,
			host: DEFAULT_HOST,
		},
		legacy: {
			sync: false,
			brackets: [],
		},
		network: {
			version: '1.0',
			seedPeers: [],
			port: DEFAULT_PORT_P2P,
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		genesis: {
			block: {
				fromFile: './config/genesis_block.blob',
			},
			blockTime: 10,
			bftBatchSize: 103,
			maxTransactionsSize: 15 * 1024, // Kilo Bytes
		},
		generator: {
			keys: {},
		},
		modules: {},
		plugins: {},
	},
};

export const outboxRootSchema = {
	$id: '/modules/interoperability/outbox',
	type: 'object',
	required: ['root'],
	properties: {
		root: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
			fieldNumber: 1,
		},
	},
};

const chainDataJSONSchema = {
	type: 'object',
	required: ['name', 'lastCertificate', 'status'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		lastCertificate: {
			type: 'object',
			fieldNumber: 2,
			required: ['height', 'timestamp', 'stateRoot', 'validatorsHash'],
			properties: {
				height: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				timestamp: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				stateRoot: {
					dataType: 'bytes',
					minLength: SHA_256_HASH_LENGTH,
					maxLength: SHA_256_HASH_LENGTH,
					fieldNumber: 3,
				},
				validatorsHash: {
					dataType: 'bytes',
					minLength: SHA_256_HASH_LENGTH,
					maxLength: SHA_256_HASH_LENGTH,
					fieldNumber: 4,
				},
			},
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const chainDataSchema = {
	$id: '/modules/interoperability/chainData',
	...chainDataJSONSchema,
};

const inboxOutboxProps = {
	appendPath: {
		type: 'array',
		items: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
		},
		fieldNumber: 1,
	},
	size: {
		dataType: 'uint32',
		fieldNumber: 2,
	},
	root: {
		dataType: 'bytes',
		minLength: SHA_256_HASH_LENGTH,
		maxLength: SHA_256_HASH_LENGTH,
		fieldNumber: 3,
	},
};

export const channelSchema = {
	$id: '/modules/interoperability/channel',
	type: 'object',
	required: ['inbox', 'outbox', 'partnerChainOutboxRoot', 'messageFeeTokenID'],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 4,
		},
	},
};

export const chainValidatorsSchema = {
	$id: '/modules/interoperability/chainValidators',
	type: 'object',
	required: ['activeValidators', 'certificateThreshold'],
	properties: {
		activeValidators: {
			type: 'array',
			fieldNumber: 1,
			minItems: 1,
			maxItems: MAX_NUM_VALIDATORS,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: {
						dataType: 'bytes',
						minLength: BLS_PUBLIC_KEY_LENGTH,
						maxLength: BLS_PUBLIC_KEY_LENGTH,
						fieldNumber: 1,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
};

export const ownChainAccountSchema = {
	$id: '/modules/interoperability/ownChainAccount',
	type: 'object',
	required: ['name', 'chainID', 'nonce'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
	},
};

export const terminatedStateSchema = {
	$id: '/modules/interoperability/terminatedState',
	type: 'object',
	required: ['stateRoot', 'mainchainStateRoot', 'initialized'],
	properties: {
		stateRoot: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
			fieldNumber: 1,
		},
		mainchainStateRoot: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
			fieldNumber: 2,
		},
		initialized: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
	},
};

export const terminatedOutboxSchema = {
	$id: '/modules/interoperability/terminatedOutbox',
	type: 'object',
	required: ['outboxRoot', 'outboxSize', 'partnerChainInboxSize'],
	properties: {
		outboxRoot: {
			dataType: 'bytes',
			minLength: SHA_256_HASH_LENGTH,
			maxLength: SHA_256_HASH_LENGTH,
			fieldNumber: 1,
		},
		outboxSize: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		partnerChainInboxSize: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const registeredNamesSchema = {
	$id: '/modules/interoperability/chainId',
	type: 'object',
	required: ['chainID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
	},
};

// TODO: Import genesis store schema directly from SDK once exported
export const genesisInteroperabilitySchema = {
	$id: '/interoperability/module/genesis',
	type: 'object',
	required: [
		'outboxRootSubstore',
		'chainDataSubstore',
		'channelDataSubstore',
		'chainValidatorsSubstore',
		'ownChainDataSubstore',
		'terminatedStateSubstore',
		'terminatedOutboxSubstore',
		'registeredNamesSubstore',
	],
	properties: {
		outboxRootSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...outboxRootSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		chainDataSubstore: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...chainDataSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		channelDataSubstore: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...channelSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		chainValidatorsSubstore: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						fieldNumber: 2,
						...chainValidatorsSchema,
					},
				},
			},
		},
		ownChainDataSubstore: {
			type: 'array',
			fieldNumber: 5,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...ownChainAccountSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		terminatedStateSubstore: {
			type: 'array',
			fieldNumber: 6,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...terminatedStateSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		terminatedOutboxSubstore: {
			type: 'array',
			fieldNumber: 7,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...terminatedOutboxSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		registeredNamesSubstore: {
			type: 'array',
			fieldNumber: 8,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...registeredNamesSchema,
						fieldNumber: 2,
					},
				},
			},
		},
	},
};
