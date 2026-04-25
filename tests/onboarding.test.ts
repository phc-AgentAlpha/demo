import { describe, expect, it, vi } from 'vitest';
import { classifyStyleWithFlock, fallbackClassifyStyle } from '@/lib/onboarding/flock-classifier';
import { buildUserProfile } from '@/lib/onboarding/profile';

describe('Flock-first onboarding classifier', () => {
  it('maps deterministic fallback combinations', () => {
    expect(fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' }).tradingStyle).toBe('aggressive');
    expect(fallbackClassifyStyle({ riskPreference: 'low', assetPreference: 'large', timeHorizon: 'long' }).tradingStyle).toBe('conservative');
    expect(fallbackClassifyStyle({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid' }).tradingStyle).toBe('neutral');
  });

  it('calls Flock when FLOCK_API_KEY exists', async () => {
    process.env.FLOCK_API_KEY = 'test-key';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ tradingStyle: 'aggressive', classificationReason: 'Flock says discovery.', recommendedSignalFilters: { tradingStyle: 'aggressive', qualityTier: 'discovered', maxPriceUsdc: 1 } }) } }] }), { status: 200 })) as unknown as typeof fetch;
    const result = await classifyStyleWithFlock({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' }, fetchMock);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.classificationSource).toBe('flock');
    expect(result.tradingStyle).toBe('aggressive');
    process.env.FLOCK_API_KEY = '';
  });

  it('falls back explicitly when Flock errors', async () => {
    process.env.FLOCK_API_KEY = 'test-key';
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const result = await classifyStyleWithFlock({ riskPreference: 'low', assetPreference: 'large', timeHorizon: 'long' }, fetchMock);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.classificationSource).toBe('fallback');
    expect(result.tradingStyle).toBe('conservative');
    process.env.FLOCK_API_KEY = '';
  });

  it('requires consent before profile persistence', () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid' });
    expect(() => buildUserProfile({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid', consentToIndexing: false, classification })).toThrow(/Consent/);
    expect(buildUserProfile({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid', consentToIndexing: true, classification }).classificationSource).toBe('fallback');
  });
});
