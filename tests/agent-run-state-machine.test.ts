import { describe, expect, it } from 'vitest';
import { startAgentRun, stopAgentRun } from '@/lib/agent/run-state-machine';
import { fallbackClassifyStyle } from '@/lib/onboarding/flock-classifier';
import { buildUserProfile } from '@/lib/onboarding/profile';
import { readLedger, saveAgentIssuance, saveProfile, savePurchase } from '@/lib/ledger/store';
import type { UserProfile } from '@/lib/types';

const agentWallet = '0x2222222222222222222222222222222222222222';

function profile(overrides: { dailyMaxUsdc?: number; maxSignalPriceUsdc?: number } = {}) {
  const classification = fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
  saveAgentIssuance({ agentId: 'agent_test_001', walletAddress: agentWallet, walletProvider: 'cdp-server-account', seed: 'aggressive', issuedAt: Date.now() });
  return saveProfile({
    ...buildUserProfile({
      walletAddress: '0x3333333333333333333333333333333333333333',
      riskPreference: 'high',
      assetPreference: 'defi',
      timeHorizon: 'short',
      consentToIndexing: true,
      classification,
      agentBudget: { maxSignalPriceUsdc: overrides.maxSignalPriceUsdc ?? 1, dailyMaxUsdc: overrides.dailyMaxUsdc ?? 5, maxSwapUsdc: 1 },
    }),
    agentId: 'agent_test_001',
    agentWalletAddress: agentWallet,
    agentWalletProvider: 'cdp-server-account',
  });
}

describe('agent run state machine', () => {
  it('runs one matched-signal cycle, persists payment evidence, and records PancakeSwap handoff logs', async () => {
    const run = await startAgentRun(profile());

    expect(run.status).toBe('running');
    expect(run.currentSignalId).toBe('sig_discovered_001');
    expect(run.currentPurchaseId).toBeTruthy();
    expect(run.cycleCount).toBe(1);
    expect(run.nextScanAt).toBeGreaterThan(Date.now());
    expect(run.events.map((event) => event.type)).toEqual(expect.arrayContaining(['run_started', 'scan_started', 'signal_matched', 'payment_started', 'payment_confirmed', 'swap_ready', 'wait_scheduled']));
    expect(readLedger().purchases[0].paymentTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('blocks before payment when the daily budget would be exceeded', async () => {
    const savedProfile = profile({ dailyMaxUsdc: 0.5, maxSignalPriceUsdc: 0.5 });
    savePurchase({
      id: 'pur_existing',
      signalId: 'sig_discovered_old',
      buyerAddress: agentWallet,
      agentWalletAddress: agentWallet,
      priceUsdc: 0.4,
      paymentMode: 'x402',
      paymentExecutor: 'agent',
      paymentStatus: 'confirmed',
      timestamp: Date.now(),
      confirmedAt: Date.now(),
    });
    const run = await startAgentRun(savedProfile);

    expect(run.status).toBe('blocked');
    expect(run.events[0].type).toBe('budget_blocked');
    expect(readLedger().purchases).toHaveLength(1);
  });

  it('records a stop transition without deleting the timeline', async () => {
    const savedProfile = profile();
    await startAgentRun(savedProfile);
    const stopped = stopAgentRun(savedProfile);

    expect(stopped.status).toBe('stopped');
    expect(stopped.events.map((event) => event.type)).toEqual(expect.arrayContaining(['stop_requested', 'run_stopped', 'payment_confirmed']));
  });

  it('starts with a legacy persisted profile that has no agentBudget field', async () => {
    const savedProfile = profile();
    delete (savedProfile as Partial<UserProfile>).agentBudget;

    const run = await startAgentRun(savedProfile);

    expect(run.status).toBe('running');
    expect(run.events.map((event) => event.type)).toContain('scan_started');
  });
});
