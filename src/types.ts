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
import { Schema } from '@liskhq/lisk-codec';

interface RPCConfig {
	enable: boolean;
	mode: 'ipc' | 'ws';
	port: number;
}

export interface NetworkConfig {
	advertiseAddress: boolean;
	wsMaxPayload: number;
	maxInboundConnections: number;
	maxOutboundConnections: number;
	hostIp: string;
	port: number;
	seedPeers: { ip: string; port: number }[];
}

export interface GenesisConfig {
	[key: string]: unknown;
	bftThreshold: number;
	communityIdentifier: string;
	blockTime: number;
	maxPayloadLength: number;
	rewards: {
		milestones: string[];
		offset: number;
		distance: number;
	};
	minFeePerByte: number;
	baseFees: {
		moduleID: number;
		assetID: number;
		baseFee: string;
	}[];
}

export interface PluginOptions extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
	readonly alias?: string;
}

export interface LoggerConfig {
	logFileName: string;
	fileLogLevel: string;
	consoleLogLevel: string;
}

export interface TransactionPool {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: string;
	readonly minReplacementFeeDifference?: string;
}

export interface ApplicationConfigV3 {
	label: string;
	version: string;
	networkVersion: string;
	rootPath: string;
	forging: Record<string, unknown>;
	network: NetworkConfig;
	logger: LoggerConfig;
	genesisConfig: GenesisConfig;
	plugins: {
		[key: string]: PluginOptions;
	};
	transactionPool: TransactionPool;
	rpc: RPCConfig;
}

export interface UnregisteredAccount {
	address: Buffer;
	balance: bigint;
}

export interface UnregisteredAddresses {
	unregisteredAddresses: UnregisteredAccount[];
}

export interface AuthAccountEntry {
	numberOfSignatures: number;
	mandatoryKeys: string[];
	optionalKeys: string[];
	nonce: string;
}

export interface AuthStoreEntry {
	address: string;
	authAccount: AuthAccountEntry;
}

export interface AuthStoreEntryBuffer extends Omit<AuthStoreEntry, 'address'> {
	address: Buffer;
}

export interface Account {
	address: Buffer;
	token: {
		balance: bigint;
	};
	sequence: {
		nonce: bigint;
	};
	keys: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
		numberOfSignatures: number;
	};
	dpos: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: bigint;
		};
		sentVotes: {
			delegateAddress: Buffer;
			amount: bigint;
		}[];
		unlocking: {
			delegateAddress: Buffer;
			amount: bigint;
			unvoteHeight: number;
		}[];
	};
}

export interface LegacyStoreEntry {
	address: string;
	balance: string;
}

export interface LegacyStoreEntryBuffer extends Omit<LegacyStoreEntry, 'address'> {
	address: Buffer;
}

export interface LegacyStoreData {
	accounts: LegacyStoreEntry[];
}

export interface UserSubstoreEntry {
	address: string;
	tokenID: string;
	availableBalance: string;
	lockedBalances: {
		module: string;
		amount: string;
	}[];
}

export interface UserSubstoreEntryBuffer extends Omit<UserSubstoreEntry, 'address' | 'tokenID'> {
	address: Buffer;
	tokenID: Buffer;
}

export interface SupplySubstoreEntry {
	tokenID: string;
	totalSupply: string;
}

export interface EscrowSubstoreEntry {
	escrowChainID: Buffer;
	tokenID: Buffer;
	amount: bigint;
}

export interface SupportedTokensSubstoreEntry {
	chainID: Buffer;
	supportedTokenIDs: Buffer[];
}

export interface TokenStoreEntry {
	userSubstore: UserSubstoreEntry[];
	supplySubstore: SupplySubstoreEntry[];
	escrowSubstore: EscrowSubstoreEntry[];
	supportedTokensSubstore: SupportedTokensSubstoreEntry[];
}

export interface SharingCoefficient {
	tokenID: string;
	coefficient: Buffer;
}

export interface ValidatorEntry {
	address: string;
	name: string;
	blsKey: string;
	proofOfPossession: string;
	generatorKey: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	reportMisbehaviorHeights: number[];
	consecutiveMissedBlocks: number;
	commission: number;
	lastCommissionIncreaseHeight: number;
	sharingCoefficients: SharingCoefficient[];
}

export interface ValidatorEntryBuffer extends Omit<ValidatorEntry, 'address'> {
	address: Buffer;
}

export interface Stake {
	validatorAddress: string;
	amount: bigint;
	sharingCoefficients: SharingCoefficient[];
}

export interface Staker {
	address: string;
	stakes: {
		validatorAddress: string;
		amount: bigint;
	}[];
	pendingUnlocks: {
		validatorAddress: string;
		amount: bigint;
		unstakeHeight: number;
	}[];
}

export interface StakerBuffer extends Omit<Staker, 'address'> {
	address: Buffer;
}

export interface GenesisDataEntry {
	initRounds: number;
	initValidators: string[];
}

export interface PoSStoreEntry {
	validators: ValidatorEntry[];
	stakers: Staker[];
	genesisData: GenesisDataEntry;
}

export interface LockedBalance {
	module: string;
	amount: string;
}

export interface GenesisAssetEntry {
	module: string;
	data: Record<string, unknown>;
	schema: Schema;
}

export interface DelegateWeight {
	readonly address: Buffer;
	readonly voteWeight: bigint;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export interface VoteWeightsWrapper {
	voteWeights: VoteWeight[];
}

export type Port = number;

export interface LastCertificate {
	height: number;
	timestamp: number;
	stateRoot: Buffer;
	validatorsHash: Buffer;
}

export interface ChainData {
	name: string;
	lastCertificate: LastCertificate;
	status: number;
}

type InboxOutbox = {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
};
export type Inbox = InboxOutbox;
export type Outbox = InboxOutbox;

export interface ChannelData {
	inbox: Inbox;
	outbox: Outbox;
	partnerChainOutboxRoot: Buffer;
	messageFeeTokenID: Buffer;
	minReturnFeePerByte: bigint;
}

export interface ActiveValidator {
	blsKey: Buffer;
	bftWeight: bigint;
}

export interface ChainValidators {
	activeValidators: ActiveValidator[];
	certificateThreshold: bigint;
}

export interface TerminatedStateAccount {
	stateRoot: Buffer;
	mainchainStateRoot: Buffer;
	initialized?: boolean;
}

export interface TerminatedOutboxAccount {
	outboxRoot: Buffer;
	outboxSize: number;
	partnerChainInboxSize: number;
}

export interface ChainInfo {
	chainID: Buffer;
	chainData: ChainData;
	channelData: ChannelData;
	chainValidators: ChainValidators;
}

export interface TerminatedStateAccountWithChainID {
	chainID: Buffer;
	terminatedStateAccount: TerminatedStateAccount;
}

export interface TerminatedOutboxAccountWithChainID {
	chainID: Buffer;
	terminatedOutboxAccount: TerminatedOutboxAccount;
}

export interface GenesisInteroperability {
	ownChainName: string;
	ownChainNonce: bigint;
	chainInfos: ChainInfo[];
	terminatedStateAccounts: TerminatedStateAccountWithChainID[];
	terminatedOutboxAccounts: TerminatedOutboxAccountWithChainID[];
}

export interface NetworkConfigLocal {
	name: string;
	tokenID: string;
	snapshotHeightPrevious: number;
}

export interface RegisteredModule {
	id: number;
	name: string;
	actions: string[];
	events: string[];
	reducers: string[];
	transactionAssets: {
		id: number;
		name: string;
	}[];
}

export interface Backup {
	height: number;
}

export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly networkIdentifier: string;
	readonly lastBlockID: string;
	readonly height: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesisConfig: GenesisConfig;
	readonly registeredModules: RegisteredModule[];
	readonly backup: Backup;
}
