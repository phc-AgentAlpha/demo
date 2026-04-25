import { getCdpAgentPaymentSigner } from '@/lib/agent/demo-agent';
import { getSignalById } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';
import { getAgentIssuance, latestProfile, savePurchase } from '@/lib/ledger/store';
import { createAgentX402PaymentIntent, executeAgentX402Payment } from '@/lib/payment/x402-payment';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signalId: string; agentWalletAddress?: string; paymentTxHash?: string };
    if (body.paymentTxHash) return jsonError('Raw transfer tx hashes are not accepted for x402 payment. Execute through the issued agent wallet and x402 facilitator.', 400);

    const signal = getSignalById(body.signalId);
    if (!signal) return jsonError('Signal not found', 404);

    const profile = body.agentWalletAddress ? latestProfile(body.agentWalletAddress) : latestProfile();
    const agentWalletAddress = profile?.agentWalletAddress;
    if (!profile || !agentWalletAddress) return jsonError('Persisted Agent/AA wallet is required. Complete onboarding first.', 400);
    if (body.agentWalletAddress && body.agentWalletAddress.toLowerCase() !== agentWalletAddress.toLowerCase()) {
      return jsonError('Requested agent wallet does not match the issued onboarding wallet.', 403);
    }
    if (!profile.consentToIndexing) return jsonError('Onboarding consent is required before agent payment.', 403);
    if (profile.agentWalletProvider !== 'cdp-smart-account') return jsonError('Live x402 payment requires a CDP smart-account agent wallet. Set CDP_AGENT_WALLET_MODE=cdp and complete onboarding again.', 400);
    const issuance = getAgentIssuance({ agentId: profile.agentId, walletAddress: agentWalletAddress });
    if (!issuance || issuance.walletProvider !== 'cdp-smart-account') return jsonError('Issued CDP agent wallet proof is missing. Complete onboarding again.', 403);

    const intent = createAgentX402PaymentIntent({ signalId: signal.id, agentWalletAddress, priceUsdc: signal.priceUsdc });
    const { x402, ...purchase } = intent;
    savePurchase(purchase);

    const signer = process.env.AGENTALPHA_MOCK_X402_SETTLEMENT === 'true' ? undefined : await getCdpAgentPaymentSigner(profile);
    const executed = await executeAgentX402Payment({ profile, purchase, x402, signer });
    savePurchase(executed.purchase);

    return jsonOk({ purchase: executed.purchase, x402, x402Settlement: executed.x402Settlement, unlocked: executed.purchase.paymentStatus === 'confirmed' });
  } catch (error) {
    return jsonError(error, 400);
  }
}
