import { getDiscoveries } from '@/lib/indexer/mock-indexer';
import { jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const signals = getDiscoveries();
  return jsonOk({ signals, count: signals.length });
}
