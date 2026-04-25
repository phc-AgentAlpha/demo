import { mockDashboard, mockEarningsSeries } from './mock-data';
import { mockExistingDerivedSignal } from './mock-indexer-data';
import type { DerivedRelation, RevenueDistributionEvent, Signal } from './types';

export type EarningsPeriod = '7d' | '30d' | '90d' | 'all';

export function materializeMyDerivedSignals(relations: DerivedRelation[], ownerAddress = mockDashboard.walletAddress): Signal[] {
  return relations.map((relation, index) => ({
    ...mockExistingDerivedSignal,
    id: relation.derivedSignalId,
    sourceWalletAddress: ownerAddress,
    ownerAddress,
    parentSignalId: relation.parentSignalId,
    rootSignalId: relation.rootSignalId,
    derivedDepth: relation.depth,
    registeredAt: relation.detectedAt,
    lastActiveAt: relation.detectedAt,
    totalSales: Math.max(mockExistingDerivedSignal.totalSales, index + 1),
    strategyTags: ['Derived Follow-up', 'Ledger Evidence', `Similarity ${Math.round(relation.similarity * 100)}%`],
    recentTrades: mockExistingDerivedSignal.recentTrades.map((trade, tradeIndex) => ({
      ...trade,
      walletAddress: ownerAddress,
      hash: relation.evidenceTxHashes[tradeIndex] ?? trade.hash,
      timestamp: relation.detectedAt - tradeIndex * 1_800_000,
    })),
  }));
}

export function summarizeEarnings(period: EarningsPeriod, events: RevenueDistributionEvent[]) {
  const seed = mockEarningsSeries.find((item) => item.label === period) ?? mockEarningsSeries[1];
  const ledgerSignalRevenue = events.reduce((sum, event) => {
    return sum + event.distributions.filter((dist) => dist.role === 'userOwner' || dist.role === 'rootOwner').reduce((roleSum, dist) => roleSum + dist.amountUsdc, 0);
  }, 0);
  const ledgerDerivedRevenue = events.reduce((sum, event) => {
    return sum + event.distributions.filter((dist) => dist.role === 'derivedOwner').reduce((roleSum, dist) => roleSum + dist.amountUsdc, 0);
  }, 0);

  const tradingPnl = seed.tradingPnl;
  const signalRevenue = Number((seed.signalRevenue + ledgerSignalRevenue).toFixed(6));
  const derivedRevenue = Number((seed.derivedRevenue + ledgerDerivedRevenue).toFixed(6));
  const total = Number((tradingPnl + signalRevenue + derivedRevenue).toFixed(6));

  return {
    period,
    tradingPnl,
    signalRevenue,
    derivedRevenue,
    total,
    deltaPercent: Number((1.8 + events.length * 0.2).toFixed(1)),
  };
}
