import { describe, expect, it } from 'vitest';
import { buildX402PaymentRequirements, createAgentX402PaymentIntent, executeAgentX402Payment } from '@/lib/payment/x402-payment';
import { preparePancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { getSignalById } from '@/lib/indexer/mock-indexer';
import { assertRealTxHash } from '@/lib/tx/verify-base-tx';
import type { UserProfile } from '@/lib/types';

const agentWallet = '0x2222222222222222222222222222222222222222';
const realLookingHash = `0x${'a'.repeat(64)}`;

function cdpProfile(): UserProfile {
  return {
    walletAddress: 'wallet_not_connected',
    agentId: 'agent_test_001',
    agentWalletAddress: agentWallet,
    agentWalletProvider: 'cdp-smart-account',
    tradingStyle: 'aggressive',
    riskPreference: 'high',
    assetPreference: 'defi',
    timeHorizon: 'short',
    classificationSource: 'fallback',
    classificationReason: 'test',
    recommendedSignalFilters: { tradingStyle: 'aggressive', qualityTier: 'discovered', maxPriceUsdc: 1 },
    consentToIndexing: true,
    consentTimestamp: Date.now(),
    createdAt: Date.now(),
  };
}

describe('live payment/execution adapter contracts', () => {
  it('rejects fixture transaction hashes', () => {
    expect(() => assertRealTxHash('fixture_tx_123')).toThrow(/Invalid or fixture/);
    expect(() => assertRealTxHash(realLookingHash)).not.toThrow();
  });

  it('enforces signal payment cap', () => {
    expect(() => createAgentX402PaymentIntent({ signalId: 'sig_verified_002', agentWalletAddress: agentWallet, priceUsdc: 1.45 })).toThrow(/exceeds demo cap/);
  });

  it('builds x402 exact payment requirements for the agent wallet without fake hashes', () => {
    const requirements = buildX402PaymentRequirements({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 });
    expect(requirements).toMatchObject({ scheme: 'exact', network: 'eip155:8453', amount: '300000' });
    expect(requirements.asset).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(requirements.payTo).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(requirements.extra.assetTransferMethod).toBe('eip3009');
  });

  it('builds x402 exact payment requirements for Base Sepolia when the network profile is switched', () => {
    const previousBaseNetwork = process.env.BASE_NETWORK;
    const previousPublicBaseNetwork = process.env.NEXT_PUBLIC_BASE_NETWORK;
    process.env.BASE_NETWORK = 'base-sepolia';
    process.env.NEXT_PUBLIC_BASE_NETWORK = 'base-sepolia';
    try {
      const requirements = buildX402PaymentRequirements({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 });
      expect(requirements).toMatchObject({ scheme: 'exact', network: 'eip155:84532', amount: '300000' });
      expect(requirements.asset).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    } finally {
      process.env.BASE_NETWORK = previousBaseNetwork;
      process.env.NEXT_PUBLIC_BASE_NETWORK = previousPublicBaseNetwork;
    }
  });

  it('rejects stale x402 payment token when Base Sepolia profile is active', () => {
    const previousBaseNetwork = process.env.BASE_NETWORK;
    const previousPublicBaseNetwork = process.env.NEXT_PUBLIC_BASE_NETWORK;
    const previousPaymentToken = process.env.X402_PAYMENT_TOKEN;
    process.env.BASE_NETWORK = 'base-sepolia';
    process.env.NEXT_PUBLIC_BASE_NETWORK = 'base-sepolia';
    process.env.X402_PAYMENT_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    try {
      expect(() => buildX402PaymentRequirements({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 })).toThrow(/X402_PAYMENT_TOKEN/);
    } finally {
      process.env.BASE_NETWORK = previousBaseNetwork;
      process.env.NEXT_PUBLIC_BASE_NETWORK = previousPublicBaseNetwork;
      if (previousPaymentToken === undefined) delete process.env.X402_PAYMENT_TOKEN;
      else process.env.X402_PAYMENT_TOKEN = previousPaymentToken;
    }
  });


  it('creates an agent x402 payment intent without direct user-wallet transfer requests', () => {
    const intent = createAgentX402PaymentIntent({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 });
    expect(intent.paymentTxHash).toBeUndefined();
    expect(intent.paymentMode).toBe('x402');
    expect(intent.paymentExecutor).toBe('agent');
    expect(intent.buyerAddress).toBe(agentWallet);
    expect(intent.x402.paymentRequirements.amount).toBe('300000');
    expect(intent).not.toHaveProperty('transferRequest');
    expect(intent.paymentStatus).toBe('awaiting_agent');
  });

  it('settles x402 through the facilitator boundary before unlock', async () => {
    const intent = createAgentX402PaymentIntent({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 });
    const result = await executeAgentX402Payment({ profile: cdpProfile(), purchase: intent, x402: intent.x402 });
    expect(result.purchase.paymentStatus).toBe('confirmed');
    expect(result.purchase.paymentTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.purchase.paymentMode).toBe('x402');
    expect(result.x402Settlement.payer).toBe(agentWallet);
    expect(result.x402Settlement.resourceUrl).toBe(intent.x402.resourceUrl);
  });

  it('rejects deterministic-dev wallets as live x402 executors', async () => {
    const intent = createAgentX402PaymentIntent({ signalId: 'sig_discovered_001', agentWalletAddress: agentWallet, priceUsdc: 0.3 });
    const profile = { ...cdpProfile(), agentWalletProvider: 'deterministic-dev' as const };
    await expect(executeAgentX402Payment({ profile, purchase: intent, x402: intent.x402 })).rejects.toThrow(/CDP smart-account/);
  });

  it('prepares PancakeSwap deep link within swap cap and slippage cap', () => {
    const signal = getSignalById('sig_discovered_001');
    expect(signal).toBeTruthy();
    const execution = preparePancakeExecution({ purchaseId: 'pur_test', signalId: signal!.id, walletAddress: agentWallet, payload: signal!.signalPayload });
    expect(execution.amountUsdc).toBeLessThanOrEqual(1);
    expect(execution.slippageBps).toBeLessThanOrEqual(100);
    expect(execution.deeplinkUrl).toContain('pancakeswap.finance/swap');
    expect(execution.verificationStatus).toBe('awaiting_wallet');
  });
});
