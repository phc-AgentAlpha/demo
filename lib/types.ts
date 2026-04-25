export type QualityTier = 'verified' | 'discovered';
export type QualityTierFilter = QualityTier | 'all';
export type SignalSource = 'indexed' | 'user' | 'derived';
export type TradingStyle = 'aggressive' | 'neutral' | 'conservative';
export type RiskPreference = 'low' | 'medium' | 'high';
export type AssetPreference = 'large' | 'defi' | 'all';
export type TimeHorizon = 'short' | 'mid' | 'long';
export type ClassificationSource = 'flock' | 'fallback';
export type ChainStatus = 'awaiting_wallet' | 'pending' | 'confirmed' | 'failed';

export interface UserProfile {
  walletAddress: string;
  paymentWalletAddress?: string;
  agentId?: string;
  agentWalletAddress?: string;
  tradingStyle: TradingStyle;
  riskPreference: RiskPreference;
  assetPreference: AssetPreference;
  timeHorizon: TimeHorizon;
  classificationSource: ClassificationSource;
  classificationReason: string;
  recommendedSignalFilters: RecommendedSignalFilters;
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
  paymentMode: 'x402' | 'real_usdc_transfer';
  paymentTxHash?: string;
  paymentStatus: ChainStatus;
  explorerUrl?: string;
  timestamp: number;
  confirmedAt?: number;
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

export interface TransferRequest {
  chainId: `0x${string}`;
  to: `0x${string}`;
  from?: `0x${string}`;
  value: `0x${string}`;
  data: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: 'USDC';
  amountUnits: string;
  amountUsdc: number;
  receiverAddress: `0x${string}`;
}
