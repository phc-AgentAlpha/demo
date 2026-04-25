import { getMarketSignals } from '@/lib/indexer/mock-indexer';
import { MarketClient } from '@/components/MarketClient';

export default function MarketPage() {
  const signals = getMarketSignals();
  return <MarketClient signals={signals} />;
}
