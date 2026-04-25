# 04. Data Model

```ts
export type QualityTier = 'verified' | 'discovered';
export type SignalSource = 'indexed' | 'user' | 'derived';
export type TradingStyle = 'aggressive' | 'neutral' | 'conservative';

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

export interface PurchaseEvent {
  id: string;
  signalId: string;
  buyerAddress: string;
  priceUsdc: number;
  paymentTxHash: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

export interface ExecutionEvent {
  id: string;
  purchaseId: string;
  signalId: string;
  walletAddress: string;
  swapTxHash: string;
  pair: string;
  direction: 'buy' | 'sell';
  amountUsdc: number;
  timestamp: number;
  verificationStatus: 'pending' | 'confirmed' | 'failed';
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
```
