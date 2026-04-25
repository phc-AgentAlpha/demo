import { getSignalById } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';
import { getPurchase, savePurchase } from '@/lib/ledger/store';
import { buildAgentX402PaymentRequest, verifyX402SettlementProof } from '@/lib/payment/x402-payment';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { purchaseId: string; paymentResponseHeader?: string; paymentTxHash?: string };
    if (body.paymentTxHash) return jsonError('Raw transfer tx hashes are not accepted for x402 payment verification. Provide a PAYMENT-RESPONSE settlement header.', 400);
    if (!body.paymentResponseHeader) return jsonError('PAYMENT-RESPONSE settlement header is required.', 400);
    const purchase = getPurchase(body.purchaseId);
    if (!purchase) return jsonError('Purchase not found', 404);
    const signal = getSignalById(purchase.signalId);
    if (!signal) return jsonError('Signal not found', 404);
    const x402 = buildAgentX402PaymentRequest({ signalId: purchase.signalId, agentWalletAddress: purchase.agentWalletAddress ?? purchase.buyerAddress, priceUsdc: purchase.priceUsdc, resourceUrl: purchase.x402ResourceUrl });
    const verified = await verifyX402SettlementProof({ purchase, x402, paymentResponseHeader: body.paymentResponseHeader });
    savePurchase(verified.purchase);
    return jsonOk({ purchase: verified.purchase, x402Settlement: verified.x402Settlement, unlocked: verified.purchase.paymentStatus === 'confirmed' });
  } catch (error) {
    return jsonError(error, 400);
  }
}
