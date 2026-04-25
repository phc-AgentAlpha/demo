import { getMarketSignals } from '@/lib/indexer/mock-indexer';
import { jsonOk } from '@/lib/http';
import type { QualityTierFilter, TradingStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qualityTier = (url.searchParams.get('qualityTier') ?? 'all') as QualityTierFilter;
  const tradingStyle = (url.searchParams.get('tradingStyle') ?? 'all') as TradingStyle | 'all';
  const maxPrice = url.searchParams.get('maxPriceUsdc');
  const signals = getMarketSignals({
    qualityTier,
    tradingStyle,
    maxPriceUsdc: maxPrice ? Number(maxPrice) : undefined,
    query: url.searchParams.get('query') ?? undefined,
  });
  return jsonOk({ signals, count: signals.length });
}
