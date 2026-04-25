import { jsonOk } from '@/lib/http';
import { readLedger } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ledger = readLedger();
  return jsonOk({ purchases: ledger.purchases, executions: ledger.executions, derivedRelations: ledger.derivedRelations, revenueEvents: ledger.revenueEvents });
}
