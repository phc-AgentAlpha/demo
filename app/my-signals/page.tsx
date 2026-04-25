import { latestProfile, readLedger } from '@/lib/ledger/store';
import { materializeMyDerivedSignals } from '@/lib/scenario-flow';
import { MySignalsClient } from '@/components/MySignalsClient';

export const dynamic = 'force-dynamic';

export default function MySignalsPage() {
  const ledger = readLedger();
  const profile = latestProfile();
  const ownerAddress = profile?.walletAddress && profile.walletAddress !== 'wallet_not_connected' ? profile.walletAddress : undefined;
  const signals = materializeMyDerivedSignals(ledger.derivedRelations, ownerAddress);
  return <MySignalsClient profile={profile} signals={signals} relations={ledger.derivedRelations} />;
}
