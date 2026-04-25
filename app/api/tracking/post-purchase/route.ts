import { isDerivedMatch } from '@/lib/derived-revenue';
import { getSignalById } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';
import { getPurchase, readLedger } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { purchaseId: string };
    const purchase = getPurchase(body.purchaseId);
    if (!purchase) return jsonError('Purchase not found', 404);
    const signal = getSignalById(purchase.signalId);
    if (!signal) return jsonError('Signal not found', 404);
    const executions = readLedger().executions.filter((event) => event.purchaseId === purchase.id && event.verificationStatus === 'confirmed');
    const matches = executions.map((event) => ({
      execution: event,
      match: isDerivedMatch({
        signalPair: signal.signalPayload.pair,
        tradePair: event.pair,
        signalDirection: signal.signalPayload.direction,
        tradeDirection: event.direction,
        purchaseTs: purchase.confirmedAt ?? purchase.timestamp,
        tradeTs: event.timestamp,
      }),
    }));
    return jsonOk({ matches });
  } catch (error) {
    return jsonError(error, 400);
  }
}
