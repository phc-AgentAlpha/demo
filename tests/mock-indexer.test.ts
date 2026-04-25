import { describe, expect, it } from 'vitest';
import { calculateDisplayPrice, getDiscoveries, getExcludedCandidates, getMarketSignals, passesCandidateThresholds } from '@/lib/indexer/mock-indexer';
import { mockIndexedSignals } from '@/lib/mock-indexer-data';

describe('mock indexer market', () => {
  it('exposes at least six verified and six discovered signals', () => {
    expect(getMarketSignals({ qualityTier: 'verified' })).toHaveLength(6);
    expect(getMarketSignals({ qualityTier: 'discovered' })).toHaveLength(6);
    expect(mockIndexedSignals).toHaveLength(12);
  });

  it('filters quality tiers and discoveries route data', () => {
    expect(getMarketSignals({ qualityTier: 'verified' }).every((signal) => signal.qualityTier === 'verified')).toBe(true);
    expect(getDiscoveries().every((signal) => signal.qualityTier === 'discovered')).toBe(true);
  });

  it('keeps excluded candidates out through threshold rules', () => {
    for (const candidate of getExcludedCandidates()) {
      expect(passesCandidateThresholds(candidate)).toBe(false);
    }
  });

  it('sorts listing score descending stably', () => {
    const scores = getMarketSignals().map((signal) => signal.listingScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('calculates display price clamp and demo cap state', () => {
    expect(calculateDisplayPrice(0.1, 1)).toEqual({ priceUsdc: 0.3, withinDemoCap: true, cappedDemoPrice: 0.3 });
    expect(calculateDisplayPrice(9, 1)).toEqual({ priceUsdc: 5, withinDemoCap: false, cappedDemoPrice: 1 });
  });
});
