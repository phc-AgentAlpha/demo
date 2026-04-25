import { getSignalById } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';
import { latestProfile, saveProfile, savePurchase } from '@/lib/ledger/store';
import { createPaymentIntent, verifyPaymentTransfer } from '@/lib/payment/x402-payment';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signalId: string; buyerAddress: string; paymentTxHash?: string };
    const signal = getSignalById(body.signalId);
    if (!signal) return jsonError('Signal not found', 404);
    const profile = latestProfile();
    if (profile?.consentToIndexing) {
      saveProfile({
        ...profile,
        walletAddress: profile.walletAddress === 'wallet_not_connected' ? body.buyerAddress : profile.walletAddress,
        paymentWalletAddress: body.buyerAddress,
      });
    }
    const intent = createPaymentIntent({ signalId: signal.id, buyerAddress: body.buyerAddress, priceUsdc: signal.priceUsdc });
    const { transferRequest, warning, ...purchase } = intent;
    savePurchase(purchase);
    if (body.paymentTxHash) {
      const verified = await verifyPaymentTransfer(purchase, body.paymentTxHash);
      savePurchase(verified);
      return jsonOk({ purchase: verified, unlocked: verified.paymentStatus === 'confirmed' });
    }
    return jsonOk({ purchase, transferRequest, warning, unlocked: false });
  } catch (error) {
    return jsonError(error, 400);
  }
}
