import { describe, expect, it } from 'vitest';
import { fallbackClassifyStyle } from '@/lib/onboarding/flock-classifier';
import { buildUserProfile } from '@/lib/onboarding/profile';
import { saveAgentIssuance, saveProfile, savePurchase, saveExecution, readLedger, latestProfile } from '@/lib/ledger/store';
import { getMarketSignals, getSignalById } from '@/lib/indexer/mock-indexer';
import { createAgentX402PaymentIntent, executeAgentX402Payment } from '@/lib/payment/x402-payment';
import { confirmPancakeExecution, preparePancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { isDerivedMatch } from '@/lib/derived-revenue';
import { POST as confirmExecutionRoute } from '@/app/api/execution/confirm/route';
import { POST as paymentSignalRoute } from '@/app/api/payment/signal/route';
import { POST as profileRoute } from '@/app/api/profile/route';
import { POST as startRunRoute } from '@/app/api/agent/run/start/route';

const agentWallet = '0x2222222222222222222222222222222222222222';
const otherWallet = '0x4444444444444444444444444444444444444444';
const userSwapWallet = '0x3333333333333333333333333333333333333333';
const swapHash = `0x${'c'.repeat(64)}`;

function classification() {
  return fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
}

function consentingProfile() {
  saveAgentIssuance({ agentId: 'agent_test_001', walletAddress: agentWallet, walletProvider: 'cdp-smart-account', seed: 'aggressive', issuedAt: Date.now() });
  return saveProfile({
    ...buildUserProfile({ walletAddress: userSwapWallet, riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification: classification() }),
    agentId: 'agent_test_001',
    agentWalletAddress: agentWallet,
    agentWalletProvider: 'cdp-smart-account',
  });
}

describe('market → agent x402 purchase → unlock → execute → derived smoke', () => {
  it('runs the adapter contract flow with mocked verifier and no fake tx hashes', async () => {
    const profile = consentingProfile();
    const market = getMarketSignals({ qualityTier: profile.recommendedSignalFilters.qualityTier, maxPriceUsdc: profile.recommendedSignalFilters.maxPriceUsdc });
    expect(market.length).toBeGreaterThan(0);
    const signal = getSignalById('sig_discovered_001')!;

    const intent = createAgentX402PaymentIntent({ signalId: signal.id, agentWalletAddress: agentWallet, priceUsdc: signal.priceUsdc });
    savePurchase(intent);
    expect(intent.paymentStatus).toBe('awaiting_agent');
    expect(intent.paymentExecutor).toBe('agent');
    const paidResult = await executeAgentX402Payment({ profile, purchase: intent, x402: intent.x402 });
    const paid = savePurchase(paidResult.purchase);
    expect(paid.paymentStatus).toBe('confirmed');

    const prepared = saveExecution(preparePancakeExecution({ purchaseId: paid.id, signalId: signal.id, walletAddress: userSwapWallet, payload: signal.signalPayload }));
    const executed = saveExecution(await confirmPancakeExecution(prepared, swapHash));
    expect(executed.verificationStatus).toBe('confirmed');

    const match = isDerivedMatch({ signalPair: signal.signalPayload.pair, tradePair: executed.pair, signalDirection: signal.signalPayload.direction, tradeDirection: executed.direction, purchaseTs: paid.confirmedAt!, tradeTs: Date.now() });
    expect(match.derived).toBe(true);
    expect(readLedger().executions[0].swapTxHash).toBe(swapHash);
  });

  it('does not register a derived signal when the agent buyer has not consented', async () => {
    const signal = getSignalById('sig_discovered_001')!;
    const intent = savePurchase({ ...createAgentX402PaymentIntent({ signalId: signal.id, agentWalletAddress: agentWallet, priceUsdc: signal.priceUsdc }), paymentStatus: 'confirmed', confirmedAt: Date.now() });
    const prepared = saveExecution(preparePancakeExecution({ purchaseId: intent.id, signalId: signal.id, walletAddress: userSwapWallet, payload: signal.signalPayload }));
    const response = await confirmExecutionRoute(new Request('http://test.local/api/execution/confirm', {
      method: 'POST',
      body: JSON.stringify({ executionId: prepared.id, swapTxHash: swapHash }),
    }));
    const payload = (await response.json()) as { derivedRelation: unknown; consentRequired: boolean };

    expect(payload.derivedRelation).toBeNull();
    expect(payload.consentRequired).toBe(true);
    expect(readLedger().derivedRelations).toHaveLength(0);
  });

  it('persists the issued agent wallet through the profile route', async () => {
    saveAgentIssuance({ agentId: 'agent_test_001', walletAddress: agentWallet, walletProvider: 'cdp-smart-account', seed: 'aggressive', issuedAt: Date.now() });
    const response = await profileRoute(new Request('http://test.local/api/profile', {
      method: 'POST',
      body: JSON.stringify({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification: classification(), agentId: 'agent_test_001', agentWalletAddress: agentWallet }),
    }));
    const payload = (await response.json()) as { profile: { agentWalletAddress?: string; agentId?: string } };

    expect(response.status).toBe(200);
    expect(payload.profile.agentWalletAddress).toBe(agentWallet);
    expect(latestProfile(agentWallet)?.agentWalletAddress).toBe(agentWallet);
  });

  it('rejects profile spoofing when the agent wallet was not issued by this server', async () => {
    const response = await profileRoute(new Request('http://test.local/api/profile', {
      method: 'POST',
      body: JSON.stringify({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification: classification(), agentId: 'spoof_agent', agentWalletAddress: otherWallet }),
    }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/not issued/);
  });

  it('uses only the persisted issued agent wallet as the x402 buyer in the payment route', async () => {
    consentingProfile();
    const response = await paymentSignalRoute(new Request('http://test.local/api/payment/signal', {
      method: 'POST',
      body: JSON.stringify({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet }),
    }));
    const payload = (await response.json()) as { purchase: { buyerAddress: string; paymentMode: string; paymentTxHash?: string }; x402: { paymentExecutor: string; agentWalletAddress: string }; x402Settlement?: { transaction: string; payer: string }; transferRequest?: unknown };

    expect(response.status).toBe(200);
    expect(payload.purchase.buyerAddress).toBe(agentWallet);
    expect(payload.purchase.paymentMode).toBe('x402');
    expect(payload.purchase.paymentTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(payload.x402.paymentExecutor).toBe('agent');
    expect(payload.x402.agentWalletAddress).toBe(agentWallet);
    expect(payload.x402Settlement?.payer).toBe(agentWallet);
    expect(payload.transferRequest).toBeUndefined();
    expect(latestProfile(agentWallet)?.agentWalletAddress).toBe(agentWallet);
  });


  it('starts the dashboard agent loop and persists run events through the API route', async () => {
    consentingProfile();
    const response = await startRunRoute(new Request('http://test.local/api/agent/run/start', {
      method: 'POST',
      body: JSON.stringify({ agentWalletAddress: agentWallet }),
    }));
    const payload = (await response.json()) as { run: { status: string; currentSignalId?: string; events: Array<{ type: string }> } };

    expect(response.status).toBe(200);
    expect(payload.run.status).toBe('running');
    expect(payload.run.currentSignalId).toBe('sig_discovered_001');
    expect(payload.run.events.map((event) => event.type)).toEqual(expect.arrayContaining(['payment_confirmed', 'swap_ready']));
  });

  it('rejects arbitrary client-supplied payment wallets that were not issued by onboarding', async () => {
    consentingProfile();
    const response = await paymentSignalRoute(new Request('http://test.local/api/payment/signal', {
      method: 'POST',
      body: JSON.stringify({ signalId: 'sig_discovered_001', agentWalletAddress: otherWallet }),
    }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Persisted Agent\/AA wallet/);
  });

  it('rejects a plain raw transfer hash as x402 payment evidence', async () => {
    consentingProfile();
    const response = await paymentSignalRoute(new Request('http://test.local/api/payment/signal', {
      method: 'POST',
      body: JSON.stringify({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, paymentTxHash: `0x${'d'.repeat(64)}` }),
    }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Raw transfer tx hashes are not accepted/);
  });

  it('registers a derived signal when the agent-buyer profile has consent', async () => {
    consentingProfile();
    const signal = getSignalById('sig_discovered_001')!;
    const intent = savePurchase({ ...createAgentX402PaymentIntent({ signalId: signal.id, agentWalletAddress: agentWallet, priceUsdc: signal.priceUsdc }), paymentStatus: 'confirmed', confirmedAt: Date.now() });
    const prepared = saveExecution(preparePancakeExecution({ purchaseId: intent.id, signalId: signal.id, walletAddress: userSwapWallet, payload: signal.signalPayload }));
    const response = await confirmExecutionRoute(new Request('http://test.local/api/execution/confirm', {
      method: 'POST',
      body: JSON.stringify({ executionId: prepared.id, swapTxHash: swapHash }),
    }));
    const payload = (await response.json()) as { derivedRelation: unknown; consentRequired: boolean };

    expect(payload.derivedRelation).toBeTruthy();
    expect(payload.consentRequired).toBe(false);
    expect(readLedger().derivedRelations).toHaveLength(1);
  });
});
