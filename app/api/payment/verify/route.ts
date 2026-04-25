import { jsonError, jsonOk } from '@/lib/http';
import { getPurchase, savePurchase } from '@/lib/ledger/store';
import { verifyPaymentTransfer } from '@/lib/payment/x402-payment';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { purchaseId: string; paymentTxHash: string };
    const purchase = getPurchase(body.purchaseId);
    if (!purchase) return jsonError('Purchase not found', 404);
    const verified = await verifyPaymentTransfer(purchase, body.paymentTxHash);
    savePurchase(verified);
    return jsonOk({ purchase: verified, unlocked: verified.paymentStatus === 'confirmed' });
  } catch (error) {
    return jsonError(error, 400);
  }
}
