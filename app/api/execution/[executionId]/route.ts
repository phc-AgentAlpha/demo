import { jsonError, jsonOk } from '@/lib/http';
import { getExecution } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { executionId: string } }) {
  const execution = getExecution(params.executionId);
  if (!execution) return jsonError('Execution not found', 404);
  return jsonOk({ execution });
}
