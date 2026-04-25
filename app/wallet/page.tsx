import { readLedger } from '@/lib/ledger/store';
import { WalletClient } from '@/components/WalletClient';

export const dynamic = 'force-dynamic';

export default function WalletPage() {
  const ledger = readLedger();
  return <WalletClient ledger={ledger} />;
}
