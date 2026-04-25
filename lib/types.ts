import type { BaseX402Network } from './chains';

export type QualityTier = 'verified' | 'discovered';
export type QualityTierFilter = QualityTier | 'all';
export type SignalSource = 'indexed' | 'user' | 'derived';
export type TradingStyle = 'aggressive' | 'neutral' | 'conservative';
export type RiskPreference = 'low' | 'medium' | 'high';
export type AssetPreference = 'large' | 'defi' | 'all';
export type TimeHorizon = 'short' | 'mid' | 'long';
export type ClassificationSource = 'flock' | 'fallback';
export type ChainStatus = 'awaiting_wallet' | 'awaiting_agent' | 'pending' | 'confirmed' | 'failed';
export type AgentWalletProvider = 'deterministic-dev' | 'cdp-server-account' | 'cdp-smart-account';
export type AgentRunStatus = 'idle' | 'running' | 'stopping' | 'stopped' | 'blocked' | 'failed';
export type AgentRunEventSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AgentBudget {
  maxSignalPriceUsdc: number;
  dailyMaxUsdc: number;
  maxSwapUsdc: number;
}

export interface UserProfile {
  walletAddress: string;
  paymentWalletAddress?: string;
  agentId?: string;
  agentWalletAddress?: string;
  agentWalletProvider?: AgentWalletProvider;
  tradingStyle: TradingStyle;
  riskPreference: RiskPreference;
  assetPreference: AssetPreference;
  timeHorizon: TimeHorizon;
  classificationSource: ClassificationSource;
  classificationReason: string;
  recommendedSignalFilters: RecommendedSignalFilters;
  agentBudget: AgentBudget;
  consentToIndexing: boolean;
  consentTimestamp: number;
  createdAt: number;
}

export interface RecommendedSignalFilters {
  tradingStyle: TradingStyle;
  qualityTier: QualityTierFilter;
  maxPriceUsdc: number;
}

export interface ClassifyStyleRequest {
  walletAddress?: string;
  riskPreference: RiskPreference;
  assetPreference: AssetPreference;
  timeHorizon: TimeHorizon;
  agentBudget?: AgentBudget;
}

export interface ClassifyStyleResponse {
  tradingStyle: TradingStyle;
  classificationSource: ClassificationSource;
  classificationReason: string;
  recommendedSignalFilters: RecommendedSignalFilters;
}

export interface RawTrade {
  hash: string;
  walletAddress: string;
  pair: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
  timestamp: number;
}

export interface TradeSignalPayload {
  pair: string;
  baseToken: string;
  quoteToken: string;
  direction: 'buy' | 'sell';
  suggestedInputToken: string;
  suggestedOutputToken: string;
  suggestedAmountUsdc: number;
  entryRationale: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Signal {
  id: string;
  sourceWalletAddress: string;
  source: SignalSource;
  ownerAddress?: string;
  parentSignalId?: string;
  rootSignalId?: string;
  derivedDepth: number;
  qualityTier: QualityTier;
  qualityScore: number;
  nansenLabels: string[];
  nansenPnl30d: number | null;
  nansenWinRate: number | null;
  totalTrades30d: number;
  totalVolumeUsd: number;
  uniqueAssets: number;
  activeDays30d: number;
  daysSinceLastTrade: number;
  tradingStyle: TradingStyle;
  strategyTags: string[];
  tradingPairs: string[];
  recentTrades: RawTrade[];
  signalPayload: TradeSignalPayload;
  priceUsdc: number;
  listingScore: number;
  registeredAt: number;
  lastActiveAt: number;
  totalSales: number;
  isDemoPurchaseTarget?: boolean;
  isDemoExecutionTarget?: boolean;
}

export interface ExcludedCandidate {
  id: string;
  totalTrades30d: number;
  uniqueAssets: number;
  totalVolumeUsd: number;
  activeDays30d: number;
  reason: string;
}

export interface PurchaseEvent {
  id: string;
  signalId: string;
  buyerAddress: string;
  priceUsdc: number;
  paymentMode: 'x402';
  paymentExecutor?: 'agent' | 'user_wallet';
  agentWalletAddress?: string;
  x402ResourceUrl?: string;
  x402Settlement?: X402SettlementProof;
  paymentTxHash?: string;
  paymentStatus: ChainStatus;
  explorerUrl?: string;
  timestamp: number;
  confirmedAt?: number;
}

export interface X402PaymentRequest {
  protocol: 'x402';
  version: 2;
  scheme: 'exact';
  network: BaseX402Network;
  resourceUrl: string;
  facilitatorUrl: string;
  paymentExecutor: 'agent';
  agentWalletAddress: string;
  receiverAddress: `0x${string}`;
  assetAddress: `0x${string}`;
  amountUnits: string;
  amountUsdc: number;
  paymentRequirements: {
    scheme: 'exact';
    network: BaseX402Network;
    amount: string;
    asset: `0x${string}`;
    payTo: `0x${string}`;
    maxTimeoutSeconds: number;
    extra: {
      name: 'USD Coin' | 'USDC';
      version: '2';
      assetTransferMethod: 'eip3009';
    };
  };
  settlementProof: 'x402_facilitator_settlement_response';
}

export interface X402SettlementProof {
  success: true;
  payer: `0x${string}`;
  transaction: `0x${string}`;
  network: BaseX402Network;
  amount: string;
  resourceUrl: string;
  paymentResponseHeader: string;
  verifiedBy: 'x402_facilitator' | 'test_x402_mock';
  settledAt: number;
}

export interface AgentIssuance {
  agentId: string;
  walletAddress: string;
  walletProvider: AgentWalletProvider;
  seed: string;
  issuedAt: number;
}

export interface AgentRunEvent {
  id: string;
  agentId: string;
  timestamp: number;
  type: 'run_started' | 'scan_started' | 'signal_matched' | 'signal_skipped' | 'budget_blocked' | 'payment_started' | 'payment_confirmed' | 'payment_failed' | 'swap_ready' | 'wait_scheduled' | 'stop_requested' | 'run_stopped' | 'run_info';
  status: AgentRunStatus;
  severity: AgentRunEventSeverity;
  message: string;
  signalId?: string;
  purchaseId?: string;
  executionId?: string;
  txHash?: string;
  explorerUrl?: string;
  href?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AgentRunState {
  agentId: string;
  agentWalletAddress: string;
  status: AgentRunStatus;
  startedAt?: number;
  stoppedAt?: number;
  updatedAt: number;
  nextScanAt?: number;
  scanIntervalMs: number;
  cycleCount: number;
  currentSignalId?: string;
  currentPurchaseId?: string;
  currentExecutionId?: string;
  lastError?: string;
  events: AgentRunEvent[];
}

export interface ExecutionEvent {
  id: string;
  purchaseId: string;
  signalId: string;
  walletAddress: string;
  swapTxHash?: string;
  pair: string;
  direction: 'buy' | 'sell';
  inputTokenAddress: `0x${string}`;
  outputTokenAddress: `0x${string}`;
  amountUsdc: number;
  timestamp: number;
  verificationStatus: ChainStatus;
  explorerUrl?: string;
  mode: 'pancakeswap_deeplink' | 'pancakeswap_plugin' | 'wallet_manual';
  deeplinkUrl?: string;
  slippageBps: number;
}

export interface DerivedRelation {
  derivedSignalId: string;
  parentSignalId: string;
  rootSignalId: string;
  depth: number;
  similarity: number;
  evidenceTxHashes: string[];
  detectedAt: number;
}

export interface RevenueDistributionEvent {
  id: string;
  saleEventId: string;
  signalId: string;
  source: SignalSource;
  distributions: Array<{
    role: 'platform' | 'rootOwner' | 'derivedOwner' | 'userOwner';
    address: string;
    amountUsdc: number;
    txHash?: string;
    status: 'calculated' | 'submitted' | 'confirmed' | 'failed';
    reason: string;
  }>;
  createdAt: number;
}
