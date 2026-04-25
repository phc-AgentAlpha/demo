import { mockExistingDerivedSignal, mockUserSignal } from '@/lib/mock-indexer-data';
import { buildRevenueDistribution } from '@/lib/revenue/distribute';
import { jsonOk } from '@/lib/http';
import { readLedger } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ledger = readLedger();
  const calculated = [
    buildRevenueDistribution({ saleEventId: 'demo_user_sale', signal: mockUserSignal, priceUsdc: mockUserSignal.priceUsdc, userOwnerAddress: mockUserSignal.ownerAddress }),
    buildRevenueDistribution({ saleEventId: 'demo_derived_sale', signal: mockExistingDerivedSignal, priceUsdc: mockExistingDerivedSignal.priceUsdc, rootSource: 'indexed', derivedOwnerAddress: mockExistingDerivedSignal.ownerAddress }),
  ];
  return jsonOk({ revenueEvents: [...ledger.revenueEvents, ...calculated], note: 'Calculated split is deterministic. Real USDC split transfer proof requires manual-live tx hash verification.' });
}
