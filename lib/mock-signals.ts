import type { SignalCardData, QualityTierDisplay, TradingStyleDisplay } from './signal-types';

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PAIRS = ['vETH/USDC', 'DEGEN/USDC', 'cbETH/USDC', 'AERO/USDC', 'BRETT/USDC', 'TOSHI/USDC', 'PRIME/USDC', 'BALD/USDC'];
const NANSEN_LABELS = [
  ['Smart DEX Trader'], ['Smart Money', 'Whale'], ['Fund'], ['MEV Bot'],
  ['Smart DEX Trader', 'Top 100 PnL'], ['Heavy DEX User'], ['Smart Money'],
];
const STYLES: TradingStyleDisplay[] = ['aggressive', 'neutral', 'conservative'];

function randomAddress(rand: () => number): string {
  const hex = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 40; i++) out += hex[Math.floor(rand() * 16)];
  return out;
}

export function buildSparkline(rand: () => number, trend: number, length = 24): number[] {
  const out: number[] = [];
  let v = 100;
  for (let i = 0; i < length; i++) {
    const noise = (rand() - 0.5) * 6;
    const drift = trend * (i / length) * 1.4;
    v += noise + drift;
    out.push(Math.max(20, v));
  }
  return out;
}

export function buildSparklineForId(id: string, pnl: number): number[] {
  const rand = mulberry32(hashId(id + '_spark'));
  return buildSparkline(rand, pnl / 4);
}

export function buildMockSignal(id: string): SignalCardData {
  const seed = hashId(id);
  const rand = mulberry32(seed);

  const tier: QualityTierDisplay = rand() > 0.45 ? 'verified' : 'discovered';
  const isVerified = tier === 'verified';
  const pair = PAIRS[Math.floor(rand() * PAIRS.length)];
  const direction = rand() > 0.42 ? 'BUY' as const : 'SELL' as const;
  const style = STYLES[Math.floor(rand() * STYLES.length)];
  const pnlBase = isVerified ? rand() * 40 + 8 : rand() * 90 - 20;
  const pnl30d = parseFloat(pnlBase.toFixed(1));
  const qualityScore = Math.floor(isVerified ? 70 + rand() * 28 : 40 + rand() * 45);
  const trades = Math.floor(isVerified ? 80 + rand() * 220 : 25 + rand() * 110);
  const activeDays = Math.floor(isVerified ? 30 + rand() * 80 : 6 + rand() * 24);
  const assetCount = Math.floor(2 + rand() * 9);
  const lastTradeAt = Date.now() - Math.floor(rand() * 60 * 36) * 60 * 1000;
  const price = isVerified
    ? parseFloat((1.0 + rand() * 2.0).toFixed(2))
    : parseFloat((0.3 + rand() * 0.5).toFixed(2));
  const labels = isVerified ? NANSEN_LABELS[Math.floor(rand() * NANSEN_LABELS.length)] : undefined;
  const earlyDiscoveryDays = !isVerified && rand() > 0.4 ? Math.floor(3 + rand() * 18) : undefined;
  const sparkline = buildSparkline(rand, pnl30d / 4);

  return {
    id, trader: randomAddress(rand), pair, direction, tier, style, price, pnl30d,
    qualityScore, trades, activeDays, assetCount, lastTradeAt, sparkline, labels,
    earlyDiscoveryDays, aboveCap: price > 1.0 && rand() > 0.85,
  };
}

export function generateMockSignalSet(count = 24, prefix = 'sig'): SignalCardData[] {
  return Array.from({ length: count }, (_, i) => buildMockSignal(`${prefix}-${String(i).padStart(3, '0')}`));
}
