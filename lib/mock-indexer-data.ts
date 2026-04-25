import { BASE_CHAIN_ID } from './chains';
import type { ExcludedCandidate, Signal } from './types';

const BASE_TIME = Date.UTC(2026, 3, 25, 0, 0, 0);

function trade(i: number, walletAddress: string, pair = 'ETH/USDC') {
  return {
    hash: `fixture_trade_${i}`,
    walletAddress,
    pair,
    direction: (i % 2 === 0 ? 'buy' : 'sell') as 'buy' | 'sell',
    amountUsd: 250 + i * 35,
    timestamp: BASE_TIME - i * 3_600_000,
  };
}

function verifiedSignal(i: number): Signal {
  const n = i + 1;
  const walletAddress = `0x${String(n).repeat(40)}` as const;
  return {
    id: `sig_verified_${String(n).padStart(3, '0')}`,
    sourceWalletAddress: walletAddress,
    source: 'indexed',
    derivedDepth: 0,
    qualityTier: 'verified',
    qualityScore: 72 + i * 3,
    nansenLabels: i % 2 === 0 ? ['Smart Money', 'Top PnL Trader'] : ['Whale', 'Smart Money'],
    nansenPnl30d: 18 + i * 4,
    nansenWinRate: 58 + i,
    totalTrades30d: 18 + i,
    totalVolumeUsd: 12_000 + i * 2_500,
    uniqueAssets: 3 + (i % 3),
    activeDays30d: 8 + i,
    daysSinceLastTrade: 1 + (i % 3),
    tradingStyle: i % 3 === 0 ? 'aggressive' : i % 3 === 1 ? 'neutral' : 'conservative',
    strategyTags: ['Nansen Verified', i % 2 === 0 ? 'Momentum' : 'Swing'],
    tradingPairs: ['ETH/USDC', 'AERO/USDC'],
    recentTrades: [trade(i, walletAddress)],
    signalPayload: {
      pair: 'ETH/USDC',
      baseToken: 'ETH',
      quoteToken: 'USDC',
      direction: 'buy',
      suggestedInputToken: 'USDC',
      suggestedOutputToken: 'ETH',
      suggestedAmountUsdc: 1,
      entryRationale: 'Verified wallet accumulated ETH after volatility compression while maintaining strong 30d PnL.',
      stopLoss: 0.97,
      takeProfit: 1.06,
    },
    priceUsdc: i === 0 ? 1.0 : 1.2 + i * 0.25,
    listingScore: 0.78 + i * 0.02,
    registeredAt: BASE_TIME - i * 86_400_000,
    lastActiveAt: BASE_TIME - i * 3_600_000,
    totalSales: 5 + i,
  };
}

function discoveredSignal(i: number): Signal {
  const n = i + 1;
  const walletAddress = `0x${String.fromCharCode(97 + i).repeat(40)}` as const;
  return {
    id: `sig_discovered_${String(n).padStart(3, '0')}`,
    sourceWalletAddress: walletAddress,
    source: 'indexed',
    derivedDepth: 0,
    qualityTier: 'discovered',
    qualityScore: 55 + i * 4,
    nansenLabels: ['Early Discovery', 'Newly Discovered'],
    nansenPnl30d: null,
    nansenWinRate: null,
    totalTrades30d: 7 + i,
    totalVolumeUsd: 1_800 + i * 900,
    uniqueAssets: 2 + (i % 4),
    activeDays30d: 3 + i,
    daysSinceLastTrade: 1,
    tradingStyle: i % 2 === 0 ? 'aggressive' : 'neutral',
    strategyTags: ['Newly Discovered', i % 2 === 0 ? 'DeFi Alt' : 'ETH Rotation'],
    tradingPairs: ['ETH/USDC', 'USDC/AERO'],
    recentTrades: [trade(10 + i, walletAddress)],
    signalPayload: {
      pair: i === 3 ? 'AERO/USDC' : 'ETH/USDC',
      baseToken: i === 3 ? 'AERO' : 'ETH',
      quoteToken: 'USDC',
      direction: 'buy',
      suggestedInputToken: 'USDC',
      suggestedOutputToken: i === 3 ? 'AERO' : 'ETH',
      suggestedAmountUsdc: i === 0 ? 0.5 : 0.75,
      entryRationale: 'Discovered wallet shows consistent small accumulation with recent activity and low crowding.',
      stopLoss: 0.98,
      takeProfit: 1.04,
    },
    priceUsdc: Number((0.3 + i * 0.08).toFixed(2)),
    listingScore: 0.58 + i * 0.04,
    registeredAt: BASE_TIME - i * 43_200_000,
    lastActiveAt: BASE_TIME - i * 1_800_000,
    totalSales: i,
    isDemoPurchaseTarget: i === 0,
    isDemoExecutionTarget: i === 0,
  };
}

export const mockIndexedSignals: Signal[] = [
  ...Array.from({ length: 6 }, (_, i) => verifiedSignal(i)),
  ...Array.from({ length: 6 }, (_, i) => discoveredSignal(i)),
];

export const mockUserSignal: Signal = {
  ...discoveredSignal(5),
  id: 'sig_user_001',
  sourceWalletAddress: '0x1234567890123456789012345678901234567890',
  source: 'user',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  derivedDepth: 0,
  qualityTier: 'discovered',
  strategyTags: ['User Registered', 'Consent Required'],
  priceUsdc: 0.5,
};

export const mockExistingDerivedSignal: Signal = {
  ...discoveredSignal(4),
  id: 'sig_derived_001',
  source: 'derived',
  ownerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  parentSignalId: 'sig_discovered_001',
  rootSignalId: 'sig_discovered_001',
  derivedDepth: 1,
  strategyTags: ['Derived Follow-up', 'Ledger Evidence'],
  priceUsdc: 0.45,
};

export const excludedCandidates: ExcludedCandidate[] = [
  { id: 'excluded_low_trades', totalTrades30d: 2, uniqueAssets: 3, totalVolumeUsd: 5_000, activeDays30d: 2, reason: 'totalTrades30d < 5' },
  { id: 'excluded_low_volume', totalTrades30d: 10, uniqueAssets: 3, totalVolumeUsd: 400, activeDays30d: 6, reason: 'totalVolumeUsd < 1000' },
  { id: 'excluded_low_assets', totalTrades30d: 9, uniqueAssets: 1, totalVolumeUsd: 3_000, activeDays30d: 5, reason: 'uniqueAssets < 2' },
];

export const mockIndexedSnapshot = {
  generatedAt: BASE_TIME,
  chainId: BASE_CHAIN_ID,
  mode: 'mock-indexer-only',
  signals: mockIndexedSignals,
  userSignals: [mockUserSignal],
  derivedSignals: [mockExistingDerivedSignal],
  excludedCandidates,
};
