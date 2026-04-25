import { describe, expect, it } from 'vitest';
import { createPaymentIntent, verifyPaymentTransfer } from '@/lib/payment/x402-payment';
import { preparePancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { getSignalById } from '@/lib/indexer/mock-indexer';
import { assertRealTxHash } from '@/lib/tx/verify-base-tx';

const buyer = '0x2222222222222222222222222222222222222222';
const realLookingHash = `0x${'a'.repeat(64)}`;

describe('live payment/execution adapter contracts', () => {
  it('rejects fixture transaction hashes', () => {
    expect(() => assertRealTxHash('fixture_tx_123')).toThrow(/Invalid or fixture/);
    expect(() => assertRealTxHash(realLookingHash)).not.toThrow();
  });

  it('enforces signal payment cap', () => {
    expect(() => createPaymentIntent({ signalId: 'sig_verified_002', buyerAddress: buyer, priceUsdc: 1.45 })).toThrow(/exceeds demo cap/);
  });

  it('creates a real USDC wallet transfer request without fake hashes', () => {
    const intent = createPaymentIntent({ signalId: 'sig_discovered_001', buyerAddress: buyer, priceUsdc: 0.3 });
    expect(intent.paymentTxHash).toBeUndefined();
    expect(intent.paymentMode).toBe('real_usdc_transfer');
    expect(intent.transferRequest.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(intent.transferRequest.data).toMatch(/^0xa9059cbb/);
    expect(intent.paymentStatus).toBe('awaiting_wallet');
  });

  it('verifies payment via tx verifier boundary before unlock', async () => {
    const intent = createPaymentIntent({ signalId: 'sig_discovered_001', buyerAddress: buyer, priceUsdc: 0.3 });
    const verified = await verifyPaymentTransfer(intent, realLookingHash);
    expect(verified.paymentStatus).toBe('confirmed');
    expect(verified.paymentTxHash).toBe(realLookingHash);
  });

  it('prepares PancakeSwap deep link within swap cap and slippage cap', () => {
    const signal = getSignalById('sig_discovered_001');
    expect(signal).toBeTruthy();
    const execution = preparePancakeExecution({ purchaseId: 'pur_test', signalId: signal!.id, walletAddress: buyer, payload: signal!.signalPayload });
    expect(execution.amountUsdc).toBeLessThanOrEqual(1);
    expect(execution.slippageBps).toBeLessThanOrEqual(100);
    expect(execution.deeplinkUrl).toContain('pancakeswap.finance/swap');
    expect(execution.verificationStatus).toBe('awaiting_wallet');
  });
});
