'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatCount, formatUSDC } from '@/lib/format';
import { useI18n } from './I18nProvider';
import type { Signal } from '@/lib/types';
import type { SignalCardData } from '@/lib/signal-types';
import { signalToCardData } from '@/lib/signal-adapter';
import { SignalCard, SignalRow, SignalRowHeader } from './SignalCard';
import { Pill, StatusDot } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Skeleton';

type SortKey = 'recommended' | 'pnl' | 'sharpe' | 'price' | 'latest';
type ViewMode = 'grid' | 'table';

export function MarketClient({ signals: rawSignals }: { signals: Signal[] }) {
  const { language, t } = useI18n();
  const [tier, setTier] = useState<'all' | 'verified' | 'discovered'>('all');
  const [style, setStyle] = useState<'all' | 'aggressive' | 'neutral' | 'conservative'>('all');
  const [maxPrice, setMaxPrice] = useState<'all' | 'half' | 'one'>('all');
  const [sort, setSort] = useState<SortKey>('recommended');
  const [view, setView] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');

  const signals: SignalCardData[] = useMemo(
    () => rawSignals.map(signalToCardData),
    [rawSignals]
  );

  const filtered = useMemo(() => {
    let xs = [...signals];
    if (tier !== 'all') xs = xs.filter((s) => s.tier === tier);
    if (style !== 'all') xs = xs.filter((s) => s.style === style);
    if (maxPrice === 'half') xs = xs.filter((s) => s.price <= 0.5);
    if (maxPrice === 'one') xs = xs.filter((s) => s.price <= 1.0);
    const q = query.trim().toLowerCase();
    if (q) {
      xs = xs.filter((s) =>
        s.pair.toLowerCase().includes(q) ||
        s.trader.toLowerCase().includes(q) ||
        (s.labels ?? []).some((l) => l.toLowerCase().includes(q))
      );
    }
    xs.sort((a, b) => {
      switch (sort) {
        case 'pnl':    return b.pnl30d - a.pnl30d;
        case 'sharpe': return b.qualityScore - a.qualityScore;
        case 'price':  return a.price - b.price;
        case 'latest': return b.lastTradeAt - a.lastTradeAt;
        default: return b.qualityScore * 1.0 + Math.max(0, b.pnl30d) * 0.6 -
                       (a.qualityScore * 1.0 + Math.max(0, a.pnl30d) * 0.6);
      }
    });
    return xs;
  }, [signals, tier, style, maxPrice, sort, query]);

  const verifiedAll = signals.filter((s) => s.tier === 'verified');
  const discoveredAll = signals.filter((s) => s.tier === 'discovered');
  const verified = filtered.filter((s) => s.tier === 'verified');
  const discovered = filtered.filter((s) => s.tier === 'discovered');

  const avgVerifiedPrice = verifiedAll.length
    ? verifiedAll.reduce((a, s) => a + s.price, 0) / verifiedAll.length : 0;
  const avgDiscoveredPrice = discoveredAll.length
    ? discoveredAll.reduce((a, s) => a + s.price, 0) / discoveredAll.length : 0;
  const todayCount = signals.filter((s) => Date.now() - s.lastTradeAt < 24 * 60 * 60 * 1000).length;

  return (
    <div className="space-y-8">
      {/* 1 · Hero */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Pill tone="default" icon={<DotMono />}>
            <span className="font-mono normal-case tracking-normal">{t('marketScopeMock')}</span>
          </Pill>
          <Pill tone="pos" icon={<StatusDot tone="pos" pulse />}>
            {t('marketScopeLiveRails')}
          </Pill>
        </div>
        <h1 className="text-display-md text-fg">{t('marketTitle')}</h1>
        <p className="text-body text-fg-muted mt-2 max-w-3xl">{t('marketSubtitle')}</p>
      </section>

      {/* 2 · Stats bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-hairline bg-hairline">
        <StatCell label={t('marketTotalIndexed')} value={formatCount(signals.length * 12, language)} />
        <StatCell label={t('marketSignalsToday')} value={formatCount(todayCount, language)} delta="+8.2%" deltaTone="pos" />
        <StatCell label={t('marketAvgPriceVerified')} value={`${avgVerifiedPrice.toFixed(2)} USDC`} accent="cyan" />
        <StatCell label={t('marketAvgPriceDiscovered')} value={`${avgDiscoveredPrice.toFixed(2)} USDC`} accent="gold" />
      </section>

      {/* 3 · Toolbar */}
      <section className="flex flex-wrap items-center gap-2 sticky top-14 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-bg/85 backdrop-blur border-b border-hairline">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-faint pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('marketSearchPlaceholder')}
            className="input pl-9"
          />
        </div>

        <SegmentedControl
          value={tier}
          onChange={(v) => setTier(v as any)}
          options={[
            { value: 'all', label: t('qualityAll') },
            { value: 'verified', label: t('qualityVerified') },
            { value: 'discovered', label: t('qualityDiscovered') },
          ]}
        />

        <SegmentedControl
          value={style}
          onChange={(v) => setStyle(v as any)}
          options={[
            { value: 'all', label: t('styleAll') },
            { value: 'aggressive', label: t('styleAggressive') },
            { value: 'neutral', label: t('styleNeutral') },
            { value: 'conservative', label: t('styleConservative') },
          ]}
        />

        <div className="flex items-center gap-1.5 ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="select w-auto pr-9"
          >
            <option value="recommended">{t('marketSortRecommended')}</option>
            <option value="pnl">{t('marketSortPnl')}</option>
            <option value="sharpe">{t('marketSortSharpe')}</option>
            <option value="price">{t('marketSortPrice')}</option>
            <option value="latest">{t('marketSortLatest')}</option>
          </select>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </section>

      {/* 4 · Verified section */}
      <section>
        <SectionHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <StatusDot tone="info" pulse={false} />
              {t('marketVerifiedSection')}
            </span>
          }
          title={
            <span className="flex items-baseline gap-2">
              <span>{t('marketVerifiedSection')}</span>
              <span className="font-mono tabular text-fg-faint text-h2">·</span>
              <span className="font-mono tabular text-fg-muted text-h2">{verified.length}</span>
            </span>
          }
          description={t('marketVerifiedHint')}
          aside={<Pill tone="cyan">{verifiedAll.length} {t('marketSignals')}</Pill>}
        />
        <SignalCollection items={verified} view={view} onBuy={() => {}} />
      </section>

      {/* 5 · Discovered section */}
      <section>
        <SectionHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <StatusDot tone="warn" pulse />
              {t('marketDiscoverySection')}
            </span>
          }
          title={
            <span className="flex items-baseline gap-2">
              <span>{t('marketDiscoverySection')}</span>
              <span className="font-mono tabular text-fg-faint text-h2">·</span>
              <span className="font-mono tabular text-gold text-h2">{discovered.length}</span>
            </span>
          }
          description={t('marketDiscoveryHint')}
          aside={<Pill tone="gold">{discoveredAll.length} {t('marketSignals')}</Pill>}
        />
        <SignalCollection items={discovered} view={view} onBuy={() => {}} />
      </section>
    </div>
  );
}

function SignalCollection({
  items,
  view,
  onBuy,
}: {
  items: SignalCardData[];
  view: ViewMode;
  onBuy: (id: string) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>}
        title={t('marketNoSignals')}
      />
    );
  }
  if (view === 'table') {
    return (
      <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
        <SignalRowHeader />
        {items.map((s) => (
          <SignalRow key={s.id} data={s} onBuy={onBuy} href={`/market/${s.id}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((s) => (
        <SignalCard key={s.id} data={s} href={`/market/${s.id}`} onBuy={onBuy} />
      ))}
    </div>
  );
}

function StatCell({
  label, value, delta, deltaTone = 'pos', accent,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'pos' | 'neg';
  accent?: 'cyan' | 'gold';
}) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="stat-label">{label}</div>
      <div className={cn(
        'mt-1 font-mono tabular text-h1 leading-tight',
        accent === 'cyan' && 'text-cyan',
        accent === 'gold' && 'text-gold',
        !accent && 'text-fg'
      )}>
        {value}
      </div>
      {delta ? (
        <div className={cn('mt-1 text-[0.7rem] font-mono', deltaTone === 'pos' ? 'text-pos' : 'text-neg')}>
          {delta}<span className="text-fg-faint ml-1">vs 24h</span>
        </div>
      ) : null}
    </div>
  );
}

function SegmentedControl({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-hairline-strong bg-surface-2 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-7 px-2.5 rounded text-[0.75rem] font-medium transition-colors',
            value === opt.value ? 'bg-surface-3 text-fg' : 'text-fg-faint hover:text-fg'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-md border border-hairline-strong bg-surface-2 p-0.5">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn('h-7 w-7 grid place-items-center rounded transition-colors', value === 'grid' ? 'bg-surface-3 text-fg' : 'text-fg-faint hover:text-fg')}
        aria-label="Grid view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={cn('h-7 w-7 grid place-items-center rounded transition-colors', value === 'table' ? 'bg-surface-3 text-fg' : 'text-fg-faint hover:text-fg')}
        aria-label="Table view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

function DotMono() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full"><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
}
