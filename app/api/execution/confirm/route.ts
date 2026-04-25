import { getSignalById } from '@/lib/indexer/mock-indexer';
import { isDerivedMatch, normalizeDerivedDepth } from '@/lib/derived-revenue';
import { confirmPancakeExecution } from '@/lib/execution/pancakeswap-ai';
import { jsonError, jsonOk } from '@/lib/http';
import { getExecution, getPurchase, latestProfile, saveDerivedRelation, saveExecution } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { executionId: string; swapTxHash: string };
    const execution = getExecution(body.executionId);
    if (!execution) return jsonError('Execution not found', 404);
    const confirmed = await confirmPancakeExecution(execution, body.swapTxHash);
    saveExecution(confirmed);

    const signal = getSignalById(confirmed.signalId);
    const purchase = getPurchase(confirmed.purchaseId);
    let derivedRelation = null;
    let consentRequired = false;
    if (signal && purchase && confirmed.verificationStatus === 'confirmed' && confirmed.swapTxHash) {
      const match = isDerivedMatch({
        signalPair: signal.signalPayload.pair,
        tradePair: confirmed.pair,
        signalDirection: signal.signalPayload.direction,
        tradeDirection: confirmed.direction,
        purchaseTs: purchase.confirmedAt ?? purchase.timestamp,
        tradeTs: Date.now(),
      });
      const profile = latestProfile(purchase.buyerAddress);
      if (match.derived && profile?.consentToIndexing) {
        const depth = normalizeDerivedDepth(signal);
        derivedRelation = saveDerivedRelation({
          derivedSignalId: `derived_${confirmed.id}`,
          parentSignalId: depth.parentSignalId,
          rootSignalId: depth.rootSignalId,
          depth: depth.depth,
          similarity: match.similarity,
          evidenceTxHashes: [confirmed.swapTxHash],
          detectedAt: Date.now(),
        });
      } else if (match.derived) {
        consentRequired = true;
      }
    }

    return jsonOk({ execution: confirmed, derivedRelation, consentRequired });
  } catch (error) {
    return jsonError(error, 400);
  }
}
