import { jsonError, jsonOk } from '@/lib/http';
import { getPurchase } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { purchaseId: string } }) {
  const purchase = getPurchase(params.purchaseId);
  if (!purchase) return jsonError('Purchase not found', 404);
  return jsonOk({ purchase, unlocked: purchase.paymentStatus === 'confirmed' });
}
