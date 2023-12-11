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

export const genesisAssets = {
	assets: [
		{
			module: 'auth',
			data: {
				authDataSubstore: [
					{
						address: 'lskzzzjwvw87yyx8ymg43a9v39t9nk2r5j54cgazv',
						authAccount: {
							numberOfSignatures: 0,
							mandatoryKeys: [],
							optionalKeys: [],
							nonce: '0',
						},
					},
					{
						address: 'lskzzxbdyfo6e3ha6qq6gnfc7xf6g2o836ej57wpf',
						authAccount: {
							numberOfSignatures: 2,
							mandatoryKeys: [
								'a0b04bd57c2526f728d0f8c2a20caaf7792f7496f6a4c96e74729021bfcd4a17',
								'c2071fb6744d0b4d2fcef1e36bb5a7eb01fe4533a73b9db104db5e91561387c5',
							],
							optionalKeys: [],
							nonce: '0',
						},
					},
				],
			},
			schema: {
				$id: '/auth/module/genesis',
				type: 'object',
				required: ['authDataSubstore'],
				properties: {
					authDataSubstore: {
						type: 'array',
						fieldNumber: 1,
						items: {
							type: 'object',
							required: ['address', 'authAccount'],
							properties: {
								address: {
									dataType: 'bytes',
									format: 'lisk32',
									fieldNumber: 1,
								},
								authAccount: {
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
			},
		},
		{
			module: 'interoperability',
			data: {
				ownChainName: 'lisk_mainchain',
				ownChainNonce: 0,
				chainInfos: [],
				terminatedStateAccounts: [],
				terminatedOutboxAccounts: [],
			},
			schema: {
				$id: '/interoperability/module/genesis',
				type: 'object',
				required: [
					'ownChainName',
					'ownChainNonce',
					'chainInfos',
					'terminatedStateAccounts',
					'terminatedOutboxAccounts',
				],
				properties: {
					ownChainName: {
						dataType: 'string',
						maxLength: 32,
						fieldNumber: 1,
					},
					ownChainNonce: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					chainInfos: {
						type: 'array',
						fieldNumber: 3,
						items: {
							type: 'object',
							required: ['chainID', 'chainData', 'channelData', 'chainValidators'],
							properties: {
								chainID: {
									dataType: 'bytes',
									minLength: 4,
									maxLength: 4,
									fieldNumber: 1,
								},
								chainData: {
									$id: '/modules/interoperability/chainData',
									type: 'object',
									required: ['name', 'lastCertificate', 'status'],
									properties: {
										name: {
											dataType: 'string',
											minLength: 1,
											maxLength: 32,
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
													minLength: 32,
													maxLength: 32,
													fieldNumber: 3,
												},
												validatorsHash: {
													dataType: 'bytes',
													minLength: 32,
													maxLength: 32,
													fieldNumber: 4,
												},
											},
										},
										status: {
											dataType: 'uint32',
											fieldNumber: 3,
										},
									},
									fieldNumber: 2,
								},
								channelData: {
									$id: '/modules/interoperability/channel',
									type: 'object',
									required: [
										'inbox',
										'outbox',
										'partnerChainOutboxRoot',
										'messageFeeTokenID',
										'minReturnFeePerByte',
									],
									properties: {
										inbox: {
											type: 'object',
											fieldNumber: 1,
											required: ['appendPath', 'size', 'root'],
											properties: {
												appendPath: {
													type: 'array',
													items: {
														dataType: 'bytes',
														minLength: 32,
														maxLength: 32,
													},
													fieldNumber: 1,
												},
												size: {
													fieldNumber: 2,
													dataType: 'uint32',
												},
												root: {
													fieldNumber: 3,
													dataType: 'bytes',
													minLength: 32,
													maxLength: 32,
												},
											},
										},
										outbox: {
											type: 'object',
											fieldNumber: 2,
											required: ['appendPath', 'size', 'root'],
											properties: {
												appendPath: {
													type: 'array',
													items: {
														dataType: 'bytes',
														minLength: 32,
														maxLength: 32,
													},
													fieldNumber: 1,
												},
												size: {
													fieldNumber: 2,
													dataType: 'uint32',
												},
												root: {
													fieldNumber: 3,
													dataType: 'bytes',
													minLength: 32,
													maxLength: 32,
												},
											},
										},
										partnerChainOutboxRoot: {
											dataType: 'bytes',
											minLength: 32,
											maxLength: 32,
											fieldNumber: 3,
										},
										messageFeeTokenID: {
											dataType: 'bytes',
											minLength: 8,
											maxLength: 8,
											fieldNumber: 4,
										},
										minReturnFeePerByte: {
											dataType: 'uint64',
											fieldNumber: 5,
										},
									},
									fieldNumber: 3,
								},
								chainValidators: {
									$id: '/modules/interoperability/chainValidators',
									type: 'object',
									required: ['activeValidators', 'certificateThreshold'],
									properties: {
										activeValidators: {
											type: 'array',
											fieldNumber: 1,
											minItems: 1,
											maxItems: 199,
											items: {
												type: 'object',
												required: ['blsKey', 'bftWeight'],
												properties: {
													blsKey: {
														dataType: 'bytes',
														minLength: 48,
														maxLength: 48,
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
									fieldNumber: 4,
								},
							},
						},
					},
					terminatedStateAccounts: {
						type: 'array',
						fieldNumber: 4,
						items: {
							type: 'object',
							required: ['chainID', 'terminatedStateAccount'],
							properties: {
								chainID: {
									dataType: 'bytes',
									minLength: 4,
									maxLength: 4,
									fieldNumber: 1,
								},
								terminatedStateAccount: {
									$id: '/modules/interoperability/terminatedState',
									type: 'object',
									required: ['stateRoot', 'mainchainStateRoot', 'initialized'],
									properties: {
										stateRoot: {
											dataType: 'bytes',
											minLength: 32,
											maxLength: 32,
											fieldNumber: 1,
										},
										mainchainStateRoot: {
											dataType: 'bytes',
											minLength: 32,
											maxLength: 32,
											fieldNumber: 2,
										},
										initialized: {
											dataType: 'boolean',
											fieldNumber: 3,
										},
									},
									fieldNumber: 2,
								},
							},
						},
					},
					terminatedOutboxAccounts: {
						type: 'array',
						fieldNumber: 5,
						items: {
							type: 'object',
							required: ['chainID', 'terminatedOutboxAccount'],
							properties: {
								chainID: {
									dataType: 'bytes',
									minLength: 4,
									maxLength: 4,
									fieldNumber: 1,
								},
								terminatedOutboxAccount: {
									$id: '/modules/interoperability/terminatedOutbox',
									type: 'object',
									required: ['outboxRoot', 'outboxSize', 'partnerChainInboxSize'],
									properties: {
										outboxRoot: {
											dataType: 'bytes',
											minLength: 32,
											maxLength: 32,
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
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
		{
			module: 'pos',
			data: {
				validators: [
					{
						address: 'lskzbqjmwmd32sx8ya56saa4gk7tkco953btm24t8',
						name: 'genesis_0',
						blsKey:
							'a6689556554e528964141d813c184ad4ec5c3564260d2709606c845f0c684b4bb5ff77054acb6eb8184a40fcd783670b',
						proofOfPossession:
							'831e87337aa9d7129b42ac2ac6d355395b07829148f3a4570293cb8ea00593cbbd1933a9393d8f5c4028f74c0d6c29511526e76d082fd2207f65e653129a29f22787cf19d4efe50ff43651e16463f868714354d6860e62dcd715858c4c53fc51',
						generatorKey: '3f44b319b82443eabb300eba5a2f323d72e44d9d2d5ed0b21a24051595582dd5',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskzot8pzdcvjhpjwrhq3dkkbf499ok7mhwkrvsq3',
						name: 'genesis_1',
						blsKey:
							'8c4167537d75e68a60e3cd208b63cfae1ffe5c13315e10a6100fcbd34ede8e38f705391c186f32f8a93df5ff3913d45f',
						proofOfPossession:
							'929e7eb36a9a379fd5cbcce326e166f897e5dfd036a5127ecaea4f5973566e24031a3aebaf131265764d642e9d435c3d0a5fb8d27b8c65e97960667b5b42f63ac34f42482afe60843eb174bd75e2eaac560bfa1935656688d013bb8087071610',
						generatorKey: '73de0a02eee8076cb64f8bc0591326bdd7447d85a24d501307d98aa912ebc766',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskz89nmk8tuwt93yzqm6wu2jxjdaftr9d5detn8v',
						name: 'genesis_2',
						blsKey:
							'b61f2da61bf5837450dcbc3bca0d6cc4fe2ba97f0325e5ee63f879e28aa9ea4dd9979f583e30236fb519a84a9cb27975',
						proofOfPossession:
							'807bca29a9eea5717c1802aebff8c29ad3f198a369081999512d31c887d8beba1a591d80a87b1122a5d9501b737188f805f3ef9a77acd051576805981cd0c5ba6e9761b5065f4d48f0e579982b45a1e35b3c282d27bb6e04262005835107a16b',
						generatorKey: '761b647f4cb146f168e41658d1dfe0e9c01e5d64b15e5c033d230210f7e0aaa8',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskx2hume2sg9grrnj94cpqkjummtz2mpcgc8dhoe',
						name: 'genesis_3',
						blsKey:
							'b19c4385aaac82c4010cc8231233593dd479f90365186b0344c25c4e11c6c921f0c5b946028330ead690347216f65549',
						proofOfPossession:
							'b61a22f607f3652226a78747f3bb52c6d680e06a8041fc1d3a94a78fabf2895f23559059a44b0c64cd759d33e60a06060197246f6886679add69f6d306506336e15cdc7e9bde0aaca6e8191fb3535b5685ce8b3f33212441d311444a3d57fc66',
						generatorKey: 'f07a86182356aee3fcfb37dcedbb6712c98319dc24b7be17cb322880d755b299',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskxa4895zkxjspdvu3e5eujash7okvnkkpr8xsr5',
						name: 'genesis_4',
						blsKey:
							'a5ca55e9a0ab81d48eaad2960bd3ea259527cf85fe62cc80cfd8400dbd2511725c06c3a597868dcc257bbc279e2b3e92',
						proofOfPossession:
							'a092cff10ea18ec3dcf3f6e41cd38537e00602e35107067ace7ab7c97a2ae1de531ebea7fc0c22e8dbcee1f981c439930c7cae474a996b153a66b0cb34e66c6041348aaeb4763413afffe0d947da90424065ee573b3683edbb1e51f9a278ae82',
						generatorKey: '0cc6c469088fb2163262ac41787ea4a81da50d92fd510299ba66e5a2b02d5a05',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskvcgy7ccuokarwqde8m8ztrur92cob6ju5quy4n',
						name: 'genesis_5',
						blsKey:
							'87cf21c4649e7f2d83aa0dd0435f73f157cbbaf32352997c5ebc7004ff3f8d72f880048c824cb98493a7ad09f4f561aa',
						proofOfPossession:
							'92d1948d5d8faec69c6a389548900952014f5803f0eedc480e291bfd8fe6f31231e43fd4bd47817bdbca96e5104b92d2097df4362b94a583a1a24bbdd0382a681b5603d6b3bbfca854d5beccd45c2ebec24623666032f30fb3858b236bfcbd14',
						generatorKey: '83cca7ee3c7145d8022b54fab14505f6f65ed9ac933e3591de4a45d4f2298adb',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskvpnf7a2eg5wpxrx9p2tnnxm8y7a7emfj8c3gst',
						name: 'genesis_6',
						blsKey:
							'86bc497e250f34a664a3330788292ee901aa286e10fcb280a4a151a8741bc0d154b947a4d3cd9bc5b552917211081466',
						proofOfPossession:
							'97a20b81bdcbc7a4f228bc00894d53d55fbb2c53960f0ddc0cfa0f77395a33858a9907079773ad50a220cbdb49bc1d171250df83dd70572c4691eb280ae99d4501b289676b6bb0ad0e859b525752015bf5113e49050a8c70853470f2dd7e9344',
						generatorKey: '1d224ad4cf64a3db52b2509c5b63365db970f34c8e09babf4af8135d9234f91f',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskvq67zzev53sa6ozt39ft3dsmwxxztb7h29275k',
						name: 'genesis_7',
						blsKey:
							'9006fc2c9d159b6890047e9b26c700d8c504e17b6fe476a2a1ac1477357c68eee332be587da425e37e22332348ed8007',
						proofOfPossession:
							'945ac6db93666aa21934d84c6ad897fe1acf1d208a17ec46b0ddf26cf6d9cdccef7db9eac682195ec47cb8e7a069bbe10706a4e1cce2012aadd311dafb270c9c810d80bc82c2b6c34ce236efac552fa0904b96533772f98e202f4e6f47c97f09',
						generatorKey: '8b65dce85de8ed215a91477627b365ec017a01cd5a715337f772ba42715cc794',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskvwy3xvehhpfh2aekcaro5sk36vp5z5kns2zaqt',
						name: 'genesis_8',
						blsKey:
							'96482192c99ac4569b2d139670e566ca5ccf41f39d50b7ddcf69d790bcd556e797614ecb3dda2017e5e3ac2bab4e82d0',
						proofOfPossession:
							'865e6e88cf91b061b92f2d499936f384c9a3df52de5717661b66c4fd5150f1b171350c6abeab96fb905b6294ca7694420728022d84f4c31180f903a6ab8b5b8153fdcf65d46c8a018e65c0459e64c931b6544b6f00e673c30f2a82402fe8be3c',
						generatorKey: '20a50d60059dff36a6f6c922f55b018d288ba1f9df5120eeb8fa8e3745a800ec',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
					{
						address: 'lskcuj9g99y36fc6em2f6zfrd83c6djsvcyzx9u3p',
						name: 'genesis_9',
						blsKey:
							'b244cdcbc419d0efd741cd7117153f9ba1a5a914e1fa686e0f601a2d3f0a79ac765c45fb3a09a297e7bc0515562ceda5',
						proofOfPossession:
							'b7a186c0576deeacb7eb8db7fe2dcdb9652ea963d2ffe0a14ad90d7698f214948611a3866dfedcb6a8da3209fee4b94a025864f94c31e09192b6de2a71421e5b08d5ac906e77471d3643374a3d84f99d8b1315f44066c044b5cdbfdfeceef78c',
						generatorKey: '80fb43e2c967cb9d050c0460d8a538f15f0ed3b16cb38e0414633f182d67a275',
						lastGeneratedHeight: 0,
						isBanned: false,
						reportMisbehaviorHeights: [],
						consecutiveMissedBlocks: 0,
						commission: 0,
						lastCommissionIncreaseHeight: 0,
						sharingCoefficients: [],
					},
				],
				stakers: [],
				genesisData: {
					initRounds: 3,
					initValidators: [
						'lskzbqjmwmd32sx8ya56saa4gk7tkco953btm24t8',
						'lskzot8pzdcvjhpjwrhq3dkkbf499ok7mhwkrvsq3',
						'lskz89nmk8tuwt93yzqm6wu2jxjdaftr9d5detn8v',
						'lskx2hume2sg9grrnj94cpqkjummtz2mpcgc8dhoe',
						'lskxa4895zkxjspdvu3e5eujash7okvnkkpr8xsr5',
						'lskvcgy7ccuokarwqde8m8ztrur92cob6ju5quy4n',
						'lskvpnf7a2eg5wpxrx9p2tnnxm8y7a7emfj8c3gst',
						'lskvq67zzev53sa6ozt39ft3dsmwxxztb7h29275k',
						'lskvwy3xvehhpfh2aekcaro5sk36vp5z5kns2zaqt',
						'lskcuj9g99y36fc6em2f6zfrd83c6djsvcyzx9u3p',
					],
				},
			},
			schema: {
				$id: '/pos/module/genesis',
				type: 'object',
				required: ['validators', 'stakers', 'genesisData'],
				properties: {
					validators: {
						type: 'array',
						fieldNumber: 1,
						items: {
							type: 'object',
							required: [
								'address',
								'name',
								'blsKey',
								'proofOfPossession',
								'generatorKey',
								'lastGeneratedHeight',
								'isBanned',
								'reportMisbehaviorHeights',
								'consecutiveMissedBlocks',
								'commission',
								'lastCommissionIncreaseHeight',
								'sharingCoefficients',
							],
							properties: {
								address: {
									dataType: 'bytes',
									format: 'lisk32',
									fieldNumber: 1,
								},
								name: {
									dataType: 'string',
									fieldNumber: 2,
									minLength: 1,
									maxLength: 20,
								},
								blsKey: {
									dataType: 'bytes',
									fieldNumber: 3,
									minLength: 48,
									maxLength: 48,
								},
								proofOfPossession: {
									dataType: 'bytes',
									fieldNumber: 4,
									minLength: 96,
									maxLength: 96,
								},
								generatorKey: {
									dataType: 'bytes',
									fieldNumber: 5,
									minLength: 32,
									maxLength: 32,
								},
								lastGeneratedHeight: {
									dataType: 'uint32',
									fieldNumber: 6,
								},
								isBanned: {
									dataType: 'boolean',
									fieldNumber: 7,
								},
								reportMisbehaviorHeights: {
									type: 'array',
									fieldNumber: 8,
									items: {
										dataType: 'uint32',
									},
								},
								consecutiveMissedBlocks: {
									dataType: 'uint32',
									fieldNumber: 9,
								},
								commission: {
									dataType: 'uint32',
									fieldNumber: 10,
								},
								lastCommissionIncreaseHeight: {
									dataType: 'uint32',
									fieldNumber: 11,
								},
								sharingCoefficients: {
									type: 'array',
									fieldNumber: 12,
									items: {
										type: 'object',
										required: ['tokenID', 'coefficient'],
										properties: {
											tokenID: {
												dataType: 'bytes',
												fieldNumber: 1,
											},
											coefficient: {
												dataType: 'bytes',
												fieldNumber: 2,
											},
										},
									},
								},
							},
						},
					},
					stakers: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							required: ['address', 'stakes', 'pendingUnlocks'],
							properties: {
								address: {
									dataType: 'bytes',
									format: 'lisk32',
									fieldNumber: 1,
								},
								stakes: {
									type: 'array',
									fieldNumber: 2,
									items: {
										type: 'object',
										required: ['validatorAddress', 'amount', 'sharingCoefficients'],
										properties: {
											validatorAddress: {
												dataType: 'bytes',
												fieldNumber: 1,
											},
											amount: {
												dataType: 'uint64',
												fieldNumber: 2,
											},
											sharingCoefficients: {
												type: 'array',
												fieldNumber: 3,
												items: {
													type: 'object',
													required: ['tokenID', 'coefficient'],
													properties: {
														tokenID: {
															dataType: 'bytes',
															fieldNumber: 1,
														},
														coefficient: {
															dataType: 'bytes',
															fieldNumber: 2,
														},
													},
												},
											},
										},
									},
								},
								pendingUnlocks: {
									type: 'array',
									fieldNumber: 3,
									items: {
										type: 'object',
										required: ['validatorAddress', 'amount', 'unstakeHeight'],
										properties: {
											validatorAddress: {
												dataType: 'bytes',
												fieldNumber: 1,
												minLength: 20,
												maxLength: 20,
											},
											amount: {
												dataType: 'uint64',
												fieldNumber: 2,
											},
											unstakeHeight: {
												dataType: 'uint32',
												fieldNumber: 3,
											},
										},
									},
								},
							},
						},
					},
					genesisData: {
						type: 'object',
						fieldNumber: 3,
						required: ['initRounds', 'initValidators'],
						properties: {
							initRounds: {
								dataType: 'uint32',
								fieldNumber: 1,
							},
							initValidators: {
								type: 'array',
								fieldNumber: 2,
								items: {
									dataType: 'bytes',
									format: 'lisk32',
								},
							},
						},
					},
				},
			},
		},
	],
};
