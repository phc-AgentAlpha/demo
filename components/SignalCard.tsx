'use client';

import Link from 'next/link';
import { calculateDisplayPrice } from '@/lib/indexer/mock-indexer';
import type { Signal } from '@/lib/types';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { qualityLabelKey } from './i18n-format';

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function signalThesis(signal: Signal) {
  const label = signal.qualityTier === 'verified' ? signal.nansenLabels[0] : 'Early Discovery';
  return `${label} · ${signal.signalPayload.pair} · ${signal.signalPayload.entryRationale.slice(0, 82)}…`;
}

export function SignalCard({ signal, href }: { signal: Signal; href?: string }) {
  const price = calculateDisplayPrice(signal.priceUsdc);
  const { t } = useI18n();
  return (
    <article className="card flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-slate-500">{shorten(signal.sourceWalletAddress)}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip label={t(qualityLabelKey(signal.qualityTier))} tone={signal.qualityTier === 'verified' ? 'success' : 'accent'} />
            {signal.isDemoPurchaseTarget ? <StatusChip label={t('signalDemoTarget')} tone="warning" /> : null}
          </div>
          <h3 className="mt-3 text-xl font-black">{signal.signalPayload.pair} · {signal.signalPayload.direction === 'buy' ? t('directionBuy') : t('directionSell')}</h3>
          <p className="mt-1 text-sm text-slate-400">{signal.strategyTags.join(' · ')}</p>
          <p className="mt-3 text-sm text-slate-300"><span className="font-bold text-accent">{t('marketThesis')}</span>: {signalThesis(signal)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{signal.priceUsdc.toFixed(2)}</div>
          <div className="text-xs text-slate-400">USDC</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-ink/60 p-3"><div className="text-slate-400">{t('signalQuality')}</div><div className="font-bold">{signal.qualityScore}</div></div>
        <div className="rounded-2xl bg-ink/60 p-3"><div className="text-slate-400">{t('signalListing')}</div><div className="font-bold">{Math.round(signal.listingScore * 100)}</div></div>
        <div className="rounded-2xl bg-ink/60 p-3"><div className="text-slate-400">{t('signalPnl')}</div><div className="font-bold">{signal.nansenPnl30d == null ? t('signalNew') : `${signal.nansenPnl30d}%`}</div></div>
        <div className="rounded-2xl bg-ink/60 p-3"><div className="text-slate-400">{t('signalTrades')}</div><div className="font-bold">{signal.totalTrades30d}</div></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {signal.nansenLabels.map((label) => <StatusChip key={label} label={label} tone={signal.qualityTier === 'verified' ? 'success' : 'accent'} />)}
      </div>
      {!price.withinDemoCap ? <p className="text-xs text-warning">{t('signalAboveCap')}</p> : null}
      <Link href={href ?? `/market/${signal.id}`} className="button mt-auto">{t('marketViewDetails')}</Link>
    </article>
  );
}
