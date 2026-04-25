import { getSignalById } from '@/lib/indexer/mock-indexer';
import { jsonError, jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const signal = getSignalById(params.id);
  if (!signal) return jsonError('Signal not found', 404);
  return jsonOk({ signal });
}
