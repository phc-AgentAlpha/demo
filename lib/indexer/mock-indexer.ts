import { getDemoCaps } from '../env';
import { excludedCandidates, mockExistingDerivedSignal, mockIndexedSignals, mockUserSignal } from '../mock-indexer-data';
import type { QualityTierFilter, Signal, TradingStyle } from '../types';

export interface MarketFilters {
  qualityTier?: QualityTierFilter;
  tradingStyle?: TradingStyle | 'all';
  maxPriceUsdc?: number;
  query?: string;
}

export function passesCandidateThresholds(candidate: Pick<Signal, 'totalTrades30d' | 'uniqueAssets' | 'totalVolumeUsd' | 'activeDays30d'>) {
  return candidate.totalTrades30d >= 5 && candidate.uniqueAssets >= 2 && candidate.totalVolumeUsd >= 1_000 && candidate.activeDays30d >= 3;
}

export function calculateDisplayPrice(priceUsdc: number, cap = getDemoCaps().maxSignalPriceUsdc) {
  const clamped = Math.min(Math.max(priceUsdc, 0.3), 5);
  return {
    priceUsdc: Number(clamped.toFixed(2)),
    withinDemoCap: clamped <= cap,
    cappedDemoPrice: Number(Math.min(clamped, cap).toFixed(2)),
  };
}

export function getMarketSignals(filters: MarketFilters = {}): Signal[] {
  const maxPrice = filters.maxPriceUsdc ?? Number.POSITIVE_INFINITY;
  const qualityTier = filters.qualityTier ?? 'all';
  const tradingStyle = filters.tradingStyle ?? 'all';
  const query = filters.query?.trim().toLowerCase();

  return mockIndexedSignals
    .filter(passesCandidateThresholds)
    .filter((signal) => qualityTier === 'all' || signal.qualityTier === qualityTier)
    .filter((signal) => tradingStyle === 'all' || signal.tradingStyle === tradingStyle)
    .filter((signal) => signal.priceUsdc <= maxPrice)
    .filter((signal) => {
      if (!query) return true;
      return [signal.id, signal.qualityTier, signal.tradingStyle, ...signal.nansenLabels, ...signal.strategyTags, ...signal.tradingPairs]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => b.listingScore - a.listingScore || b.qualityScore - a.qualityScore || a.id.localeCompare(b.id));
}

export function getDiscoveries() {
  return getMarketSignals({ qualityTier: 'discovered' });
}

export function getSignalById(id: string): Signal | undefined {
  return [...mockIndexedSignals, mockUserSignal, mockExistingDerivedSignal].find((signal) => signal.id === id);
}

export function getLineageForSignal(id: string) {
  const signal = getSignalById(id);
  if (!signal) return { signal: undefined, root: undefined, parent: undefined, derived: [] as Signal[] };
  const root = signal.rootSignalId ? getSignalById(signal.rootSignalId) : signal;
  const parent = signal.parentSignalId ? getSignalById(signal.parentSignalId) : undefined;
  const derived = [mockExistingDerivedSignal].filter((item) => item.parentSignalId === id || item.rootSignalId === id);
  return { signal, root, parent, derived };
}

export function getExcludedCandidates() {
  return excludedCandidates;
}

export function assertNoAlchemyIndexerRoutes(pathname: string) {
  if (pathname.includes('/api/indexer') || pathname.toLowerCase().includes('alchemy')) {
    throw new Error('Live indexer/Alchemy routes are explicitly out of scope for this demo.');
  }
}
