import { buildRevenueDistribution } from '@/lib/revenue/distribute';
import { mockExistingDerivedSignal, mockUserSignal } from '@/lib/mock-indexer-data';
import { readLedger } from '@/lib/ledger/store';
import { EarningsClient } from '@/components/EarningsClient';

export const dynamic = 'force-dynamic';

export default function EarningsPage() {
  const ledger = readLedger();
  const examples = [
    buildRevenueDistribution({ saleEventId: 'demo_user_sale', signal: mockUserSignal, priceUsdc: mockUserSignal.priceUsdc, userOwnerAddress: mockUserSignal.ownerAddress }),
    buildRevenueDistribution({ saleEventId: 'demo_derived_sale', signal: mockExistingDerivedSignal, priceUsdc: mockExistingDerivedSignal.priceUsdc, rootSource: 'indexed', derivedOwnerAddress: mockExistingDerivedSignal.ownerAddress }),
    ...ledger.revenueEvents,
  ];
  return <EarningsClient events={examples} />;
}
