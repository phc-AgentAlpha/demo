'use client';

import { useMemo, useState } from 'react';
import { explorerTxUrl, getPublicBaseNetworkProfile } from '@/lib/chains';
import { summarizeEarnings, type EarningsPeriod } from '@/lib/scenario-flow';
import type { RevenueDistributionEvent } from '@/lib/types';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { statusLabelKey } from './i18n-format';

const periods = ['7d', '30d', '90d', 'all'] as const satisfies readonly EarningsPeriod[];

function short(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function EarningsClient({ events }: { events: RevenueDistributionEvent[] }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<EarningsPeriod>('30d');
  const publicBaseProfile = useMemo(() => getPublicBaseNetworkProfile(), []);
  const summary = useMemo(() => summarizeEarnings(period, events), [period, events]);
  const rows = events.map((event, index) => {
    const mine = event.distributions.filter((dist) => dist.role !== 'platform').reduce((sum, dist) => sum + dist.amountUsdc, 0);
    const paid = event.distributions.reduce((sum, dist) => sum + dist.amountUsdc, 0);
    const proof = event.distributions.find((dist) => dist.txHash);
    return {
      event,
      buyer: `buyer-${String(index + 1).padStart(2, '0')}`,
      paid,
      mine,
      proofHash: proof?.txHash,
      rootShare: event.source === 'derived' ? event.distributions.find((dist) => dist.role === 'rootOwner')?.amountUsdc ?? 0 : 0,
    };
  });

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap gap-2"><StatusChip label={t('earningsSplitBadge')} tone="accent" /><StatusChip label={t('earningsProofBadge')} tone="warning" /></div>
        <h1 className="mt-4 text-4xl font-black">{t('earningsTitle')}</h1>
        <p className="mt-2 text-slate-300">{t('earningsSubtitle')}</p>
      </section>
      <section className="flex flex-wrap gap-2">
        {periods.map((item) => (
          <button key={item} className={period === item ? 'button px-4 py-2' : 'button-secondary px-4 py-2'} type="button" onClick={() => setPeriod(item)}>
            {t(item === '7d' ? 'earningsPeriod7d' : item === '30d' ? 'earningsPeriod30d' : item === '90d' ? 'earningsPeriod90d' : 'earningsPeriodAll')}
          </button>
        ))}
      </section>
      <section className="card bg-surface text-center">
        <div className="stat-label">{t('earningsTotal')}</div>
        <div className="mt-3 font-mono tabular text-display-md font-semibold text-cyan">{summary.total.toFixed(2)} USDC</div>
        <div className="mt-2 text-small font-mono text-pos">+{summary.deltaPercent}% {t('earningsDelta')}</div>
      </section>
      <section className="grid gap-5 md:grid-cols-3">
        <Metric label={t('earningsTrading')} value={`${summary.tradingPnl.toFixed(2)} USDC`} border="border-accent" />
        <Metric label={t('earningsSignalSales')} value={`${summary.signalRevenue.toFixed(2)} USDC`} border="border-success" />
        <Metric label={t('earningsDerived')} value={`${summary.derivedRevenue.toFixed(2)} USDC`} border="border-purple-500" />
      </section>
      <section className="card">
        <h2 className="text-2xl font-black">{t('earningsChartTitle')}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MiniLine label={t('earningsTrading')} color="bg-accent" values={[0.32, 0.48, 0.42, 0.68, 0.76, 0.9]} />
          <MiniLine label={t('earningsSignalSales')} color="bg-success" values={[0.2, 0.28, 0.33, 0.47, 0.59, 0.72]} />
        </div>
      </section>
      <section className="card overflow-x-auto">
        <h2 className="text-2xl font-black">{t('earningsSale')}</h2>
        <table className="mt-5 w-full min-w-[760px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-3">{t('earningsTableBuyer')}</th>
              <th>{t('earningsTableSignal')}</th>
              <th>{t('earningsSource')}</th>
              <th>{t('earningsTableAmount')}</th>
              <th>{t('earningsTableMine')}</th>
              <th>{t('earningsTableDate')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ event, buyer, paid, mine, proofHash, rootShare }) => (
              <tr key={event.id} className="border-t border-line">
                <td className="py-4 font-mono text-slate-300">{short(buyer)}</td>
                <td className="font-mono text-accent">{short(event.signalId)}</td>
                <td><StatusChip label={event.source} tone={event.source === 'derived' ? 'accent' : event.source === 'user' ? 'success' : 'neutral'} /></td>
                <td>{paid.toFixed(2)} USDC</td>
                <td className="font-semibold text-success">
                  {mine.toFixed(2)} USDC
                  {event.source === 'derived' ? <div className="text-xs font-normal text-slate-500">{t('detailOriginal')} {rootShare.toFixed(2)} USDC</div> : null}
                </td>
                <td>
                  {proofHash ? <a className="text-accent underline" href={explorerTxUrl(proofHash, publicBaseProfile)} target="_blank" rel="noreferrer">{new Date(event.createdAt).toLocaleDateString()}</a> : new Date(event.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="card">
            <h2 className="text-xl font-black">{event.signalId}</h2>
            <p className="text-sm text-slate-400">{t('earningsSale')}: {event.saleEventId} · {t('earningsSource')} {event.source}</p>
            <div className="mt-4 space-y-3">
              {event.distributions.map((dist) => {
                const statusKey = statusLabelKey(dist.status);
                return (
                  <div key={`${event.id}-${dist.role}`} className="rounded-2xl bg-ink/70 p-4">
                    <div className="flex items-center justify-between"><strong>{dist.role}</strong><StatusChip label={statusKey ? t(statusKey) : dist.status} tone={dist.status === 'confirmed' ? 'success' : 'warning'} /></div>
                    <div className="mt-1 text-sm text-slate-300">{dist.amountUsdc.toFixed(6)} USDC · {dist.reason}</div>
                    <div className="mt-1 break-all font-mono text-xs text-slate-500">{dist.address}</div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value, border }: { label: string; value: string; border: string }) {
  return (
    <div className={`card border-l-4 ${border}`}>
      <div className="text-micro uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className="mt-2 font-mono tabular text-h1 font-semibold text-fg leading-tight">{value}</div>
    </div>
  );
}

function MiniLine({ label, color, values }: { label: string; color: string; values: number[] }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 p-4">
      <div className="text-small font-medium text-fg-muted">{label}</div>
      <div className="mt-4 flex h-28 items-end gap-1.5">
        {values.map((value, index) => <div key={`${label}-${index}`} className={`flex-1 rounded-t-md ${color} opacity-80`} style={{ height: `${value * 100}%` }} />)}
      </div>
    </div>
  );
}
