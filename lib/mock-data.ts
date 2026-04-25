import { mockIndexedSignals } from './mock-indexer-data';

export const mockStats = {
  totalIndexed: 1247,
  todaySignals: 8342,
  verifiedCount: mockIndexedSignals.filter((signal) => signal.qualityTier === 'verified').length,
  discoveredCount: mockIndexedSignals.filter((signal) => signal.qualityTier === 'discovered').length,
};

export const mockDashboard = {
  agentId: '001',
  walletAddress: '0xa1e0aa0000000000000000000000000000000001',
  usdcBalance: 24.8,
  tradingPnl: 12.4,
  purchaseCount: 3,
  signalRevenueDirect: 1.42,
  signalRevenueDerived: 0.68,
  recentTrades: [
    { asset: 'ETH', direction: 'buy', pnl: 3.2, date: '2026-04-25' },
    { asset: 'AERO', direction: 'buy', pnl: 8.7, date: '2026-04-24' },
    { asset: 'USDC', direction: 'sell', pnl: -1.1, date: '2026-04-23' },
    { asset: 'ETH', direction: 'buy', pnl: 2.4, date: '2026-04-22' },
    { asset: 'DEGEN', direction: 'buy', pnl: 5.6, date: '2026-04-21' },
  ],
};

export const mockEarningsSeries = [
  { label: '7d', tradingPnl: 4.2, signalRevenue: 0.28, derivedRevenue: 0.12 },
  { label: '30d', tradingPnl: 12.4, signalRevenue: 1.42, derivedRevenue: 0.68 },
  { label: '90d', tradingPnl: 28.6, signalRevenue: 4.7, derivedRevenue: 2.1 },
  { label: 'all', tradingPnl: 42.3, signalRevenue: 8.4, derivedRevenue: 3.9 },
];
