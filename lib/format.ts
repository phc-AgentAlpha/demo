import type { Language } from './i18n';

const COMPACT_EN = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_KO = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatUSDC(amount: number, opts: { withSymbol?: boolean; decimals?: number } = {}): string {
  const { withSymbol = true, decimals = 2 } = opts;
  const abs = Math.abs(amount);
  const txt = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return withSymbol ? `${amount < 0 ? '-' : ''}${txt} USDC` : `${amount < 0 ? '-' : ''}${txt}`;
}

export function formatPercent(pct: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  const { decimals = 1, signed = true } = opts;
  const sign = pct > 0 && signed ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function formatCount(value: number, lang: Language = 'en'): string {
  if (value < 1000) return value.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
  return (lang === 'ko' ? COMPACT_KO : COMPACT_EN).format(value);
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length < head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function shortHash(hash: string, head = 8, tail = 6): string {
  return shortAddress(hash, head, tail);
}

export function relativeTime(timestamp: number, now = Date.now(), lang: Language = 'en'): string {
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (lang === 'ko') {
    if (day > 0) return `${day}일 전`;
    if (hr > 0) return `${hr}시간 전`;
    if (min > 0) return `${min}분 전`;
    return '방금';
  }
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return 'just now';
}

export function deltaClass(value: number): string {
  if (value > 0) return 'text-pos';
  if (value < 0) return 'text-neg';
  return 'text-fg-muted';
}
