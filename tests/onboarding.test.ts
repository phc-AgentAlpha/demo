import { describe, expect, it, vi } from 'vitest';
import { classifyStyleWithFlock, fallbackClassifyStyle } from '@/lib/onboarding/flock-classifier';
import { buildUserProfile, normalizeAgentBudget } from '@/lib/onboarding/profile';
import { migrateUserProfile } from '@/lib/profile-migration';
import type { UserProfile } from '@/lib/types';

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
    const profile = buildUserProfile({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid', consentToIndexing: true, classification });
    expect(profile.classificationSource).toBe('fallback');
    expect(profile.walletAddress).toBe('wallet_not_connected');
    expect(profile.agentWalletAddress).toBeUndefined();
    expect(profile.agentBudget).toMatchObject({ maxSignalPriceUsdc: 1, dailyMaxUsdc: 3, maxSwapUsdc: 1 });
  });

  it('persists explicit agent budget and clamps recommended market max to the user budget', () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
    const profile = buildUserProfile({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification, agentBudget: { maxSignalPriceUsdc: 0.5, dailyMaxUsdc: 2, maxSwapUsdc: 0.5 } });
    expect(profile.agentBudget).toEqual({ maxSignalPriceUsdc: 0.5, dailyMaxUsdc: 2, maxSwapUsdc: 0.5 });
    expect(profile.recommendedSignalFilters.maxPriceUsdc).toBe(0.5);
  });

  it('rejects unsafe onboarding budgets before profile persistence', () => {
    expect(() => normalizeAgentBudget({ agentBudget: { maxSignalPriceUsdc: 2, dailyMaxUsdc: 2, maxSwapUsdc: 1 } })).toThrow(/signal budget/);
    expect(() => normalizeAgentBudget({ agentBudget: { maxSignalPriceUsdc: 0.5, dailyMaxUsdc: 0.4, maxSwapUsdc: 0.5 } })).toThrow(/Daily/);
  });

  it('migrates legacy stored profiles that predate agent budgets', () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid' });
    const legacy = buildUserProfile({ riskPreference: 'medium', assetPreference: 'all', timeHorizon: 'mid', consentToIndexing: true, classification });
    delete (legacy as Partial<UserProfile>).agentBudget;

    const migrated = migrateUserProfile(legacy);

    expect(migrated.agentBudget).toEqual({ maxSignalPriceUsdc: 1, dailyMaxUsdc: 3, maxSwapUsdc: 1 });
    expect(migrated.recommendedSignalFilters.maxPriceUsdc).toBeLessThanOrEqual(migrated.agentBudget.maxSignalPriceUsdc);
  });
});
