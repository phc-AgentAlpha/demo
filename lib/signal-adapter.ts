import type { Signal } from './types';
import type { SignalCardData } from './signal-types';
import { buildSparklineForId } from './mock-signals';
import { calculateDisplayPrice } from './indexer/mock-indexer';

export function signalToCardData(signal: Signal): SignalCardData {
  const { withinDemoCap } = calculateDisplayPrice(signal.priceUsdc);
  const pnl = signal.nansenPnl30d ?? 0;

  return {
    id: signal.id,
    trader: signal.sourceWalletAddress,
    pair: signal.signalPayload.pair,
    direction: signal.signalPayload.direction === 'buy' ? 'BUY' : 'SELL',
    tier: signal.qualityTier,
    style: signal.tradingStyle,
    price: signal.priceUsdc,
    pnl30d: pnl,
    qualityScore: signal.qualityScore,
    trades: signal.totalTrades30d,
    activeDays: signal.activeDays30d,
    assetCount: signal.uniqueAssets,
    lastTradeAt: signal.lastActiveAt,
    sparkline: buildSparklineForId(signal.id, pnl),
    labels: signal.qualityTier === 'verified' && signal.nansenLabels.length > 0
      ? signal.nansenLabels
      : undefined,
    earlyDiscoveryDays: signal.qualityTier === 'discovered' ? undefined : undefined,
    aboveCap: !withinDemoCap,
    thesis: signal.signalPayload.entryRationale,
  };
}
