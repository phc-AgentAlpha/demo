import { getSignalById } from '@/lib/indexer/mock-indexer';
import { preparePancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { jsonError, jsonOk } from '@/lib/http';
import { getPurchase, saveExecution } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { purchaseId: string; signalId: string; walletAddress: string };
    const purchase = getPurchase(body.purchaseId);
    if (!purchase || purchase.paymentStatus !== 'confirmed') return jsonError('Signal is locked until payment is confirmed.', 403);
    if (purchase.signalId !== body.signalId) return jsonError('Purchase does not match signal.', 400);
    const signal = getSignalById(body.signalId);
    if (!signal) return jsonError('Signal not found', 404);
    const execution = preparePancakeExecution({ purchaseId: purchase.id, signalId: signal.id, walletAddress: body.walletAddress, payload: signal.signalPayload });
    saveExecution(execution);
    return jsonOk({ execution });
  } catch (error) {
    return jsonError(error, 400);
  }
}
