import { describe, expect, it } from 'vitest';
import { isDerivedMatch, normalizeDerivedDepth, splitRevenue, timeProximityScore } from '@/lib/derived-revenue';
import { mockExistingDerivedSignal } from '@/lib/mock-indexer-data';

describe('derived detection and revenue split', () => {
  it('scores 24h time proximity', () => {
    expect(timeProximityScore(0, 0)).toBe(1);
    expect(timeProximityScore(0, 25 * 3600_000)).toBe(0);
  });

  it('creates derived match from same pair/direction inside window', () => {
    const match = isDerivedMatch({ signalPair: 'ETH/USDC', tradePair: 'ETH/USDC', signalDirection: 'buy', tradeDirection: 'buy', purchaseTs: 0, tradeTs: 3600_000 });
    expect(match.derived).toBe(true);
    expect(match.similarity).toBeGreaterThan(0.8);
  });

  it('flattens derived-of-derived depth to root direct mapping', () => {
    const normalized = normalizeDerivedDepth({ ...mockExistingDerivedSignal, derivedDepth: 2 });
    expect(normalized.depth).toBe(1);
    expect(normalized.parentSignalId).toBe(mockExistingDerivedSignal.rootSignalId);
  });

  it('splits revenue by source', () => {
    expect(splitRevenue('indexed', 1)).toEqual({ platform: 1 });
    expect(splitRevenue('user', 1)).toEqual({ userOwner: 0.8, platform: 0.2 });
    expect(splitRevenue('derived', 1, 'user')).toEqual({ rootOwner: 0.5, derivedOwner: 0.3, platform: 0.2 });
    expect(splitRevenue('derived', 1, 'indexed')).toEqual({ rootOwner: 0, derivedOwner: 0.3, platform: 0.7 });
  });
});
