import { getLineageForSignal } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const lineage = getLineageForSignal(params.id);
  if (!lineage.signal) return jsonError('Signal not found', 404);
  return jsonOk(lineage);
}
