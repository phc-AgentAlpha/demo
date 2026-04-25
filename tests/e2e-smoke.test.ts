import { describe, expect, it } from 'vitest';
import { fallbackClassifyStyle } from '@/lib/onboarding/flock-classifier';
import { buildUserProfile } from '@/lib/onboarding/profile';
import { saveProfile, savePurchase, saveExecution, readLedger, latestProfile } from '@/lib/ledger/store';
import { getMarketSignals, getSignalById } from '@/lib/indexer/mock-indexer';
import { createPaymentIntent, verifyPaymentTransfer } from '@/lib/payment/x402-payment';
import { confirmPancakeExecution, preparePancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { isDerivedMatch } from '@/lib/derived-revenue';
import { POST as confirmExecutionRoute } from '@/app/api/execution/confirm/route';
import { POST as paymentSignalRoute } from '@/app/api/payment/signal/route';

const buyer = '0x2222222222222222222222222222222222222222';
const paymentHash = `0x${'b'.repeat(64)}`;
const swapHash = `0x${'c'.repeat(64)}`;

describe('market → purchase → unlock → execute → derived smoke', () => {
  it('runs the adapter contract flow with mocked verifier and no fake tx hashes', async () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
    const profile = saveProfile(buildUserProfile({ walletAddress: buyer, riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification }));
    const market = getMarketSignals({ qualityTier: profile.recommendedSignalFilters.qualityTier, maxPriceUsdc: profile.recommendedSignalFilters.maxPriceUsdc });
    expect(market.length).toBeGreaterThan(0);
    const signal = getSignalById('sig_discovered_001')!;

    const intent = savePurchase(createPaymentIntent({ signalId: signal.id, buyerAddress: buyer, priceUsdc: signal.priceUsdc }));
    expect(intent.paymentStatus).toBe('awaiting_wallet');
    const paid = savePurchase(await verifyPaymentTransfer(intent, paymentHash));
    expect(paid.paymentStatus).toBe('confirmed');

    const prepared = saveExecution(preparePancakeExecution({ purchaseId: paid.id, signalId: signal.id, walletAddress: buyer, payload: signal.signalPayload }));
    const executed = saveExecution(await confirmPancakeExecution(prepared, swapHash));
    expect(executed.verificationStatus).toBe('confirmed');

    const match = isDerivedMatch({ signalPair: signal.signalPayload.pair, tradePair: executed.pair, signalDirection: signal.signalPayload.direction, tradeDirection: executed.direction, purchaseTs: paid.confirmedAt!, tradeTs: Date.now() });
    expect(match.derived).toBe(true);
    expect(readLedger().executions[0].swapTxHash).toBe(swapHash);
  });

  it('does not register a derived signal when the buyer has not consented', async () => {
    const signal = getSignalById('sig_discovered_001')!;
    const intent = savePurchase({ ...createPaymentIntent({ signalId: signal.id, buyerAddress: buyer, priceUsdc: signal.priceUsdc }), paymentStatus: 'confirmed', confirmedAt: Date.now() });
    const prepared = saveExecution(preparePancakeExecution({ purchaseId: intent.id, signalId: signal.id, walletAddress: buyer, payload: signal.signalPayload }));
    const response = await confirmExecutionRoute(new Request('http://test.local/api/execution/confirm', {
      method: 'POST',
      body: JSON.stringify({ executionId: prepared.id, swapTxHash: swapHash }),
    }));
    const payload = (await response.json()) as { derivedRelation: unknown; consentRequired: boolean };

    expect(payload.derivedRelation).toBeNull();
    expect(payload.consentRequired).toBe(true);
    expect(readLedger().derivedRelations).toHaveLength(0);
  });

  it('maps an unconnected consenting onboarding profile to the live payment wallet', async () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
    saveProfile(buildUserProfile({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification }));
    const response = await paymentSignalRoute(new Request('http://test.local/api/payment/signal', {
      method: 'POST',
      body: JSON.stringify({ signalId: 'sig_discovered_001', buyerAddress: buyer }),
    }));
    const payload = (await response.json()) as { purchase: { buyerAddress: string; paymentTxHash?: string }; transferRequest: unknown };

    expect(response.status).toBe(200);
    expect(payload.purchase.buyerAddress).toBe(buyer);
    expect(payload.purchase.paymentTxHash).toBeUndefined();
    expect(latestProfile(buyer)?.walletAddress).toBe(buyer);
  });

  it('registers a derived signal when the buyer profile has consent', async () => {
    const classification = fallbackClassifyStyle({ riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short' });
    saveProfile(buildUserProfile({ walletAddress: buyer, riskPreference: 'high', assetPreference: 'defi', timeHorizon: 'short', consentToIndexing: true, classification }));
    const signal = getSignalById('sig_discovered_001')!;
    const intent = savePurchase({ ...createPaymentIntent({ signalId: signal.id, buyerAddress: buyer, priceUsdc: signal.priceUsdc }), paymentStatus: 'confirmed', confirmedAt: Date.now() });
    const prepared = saveExecution(preparePancakeExecution({ purchaseId: intent.id, signalId: signal.id, walletAddress: buyer, payload: signal.signalPayload }));
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
