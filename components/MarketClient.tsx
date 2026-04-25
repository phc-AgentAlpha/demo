'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QualityTierFilter, Signal, TradingStyle, UserProfile } from '@/lib/types';
import { SignalCard } from './SignalCard';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';

type SortOption = 'recommended' | 'pnl' | 'sharpe' | 'price' | 'latest';

export function MarketClient({ signals }: { signals: Signal[] }) {
  const { t } = useI18n();
  const [qualityTier, setQualityTier] = useState<QualityTierFilter>('all');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('recommended');
  const [profileSource, setProfileSource] = useState<string>('');

  useEffect(() => {
    const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
    if (!raw) return;
    try {
      const profile = JSON.parse(raw) as UserProfile;
      setQualityTier(profile.recommendedSignalFilters.qualityTier);
      setTradingStyle(profile.recommendedSignalFilters.tradingStyle);
      setProfileSource(`${profile.tradingStyle} profile · ${profile.classificationSource}`);
    } catch {
      setProfileSource('Profile parse error');
    }
  }, []);

  const filtered = useMemo(() => {
    const base = signals
      .filter((signal) => qualityTier === 'all' || signal.qualityTier === qualityTier)
      .filter((signal) => tradingStyle === 'all' || signal.tradingStyle === tradingStyle);
    return [...base].sort((a, b) => {
      if (sort === 'pnl') return (b.nansenPnl30d ?? 0) - (a.nansenPnl30d ?? 0);
      if (sort === 'sharpe') return b.qualityScore - a.qualityScore;
      if (sort === 'price') return a.priceUsdc - b.priceUsdc;
      if (sort === 'latest') return b.lastActiveAt - a.lastActiveAt;
      return b.listingScore - a.listingScore || b.qualityScore - a.qualityScore;
    });
  }, [signals, qualityTier, tradingStyle, sort]);

  const verified = filtered.filter((signal) => signal.qualityTier === 'verified');
  const discovered = filtered.filter((signal) => signal.qualityTier === 'discovered');

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusChip label={t('marketScopeMock')} tone="warning" />
              <StatusChip label={t('marketScopeLiveRails')} tone="success" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">{t('marketTitle')}</h1>
            <p className="mt-2 max-w-3xl text-slate-300">{t('marketSubtitle')}</p>
            <p className="mt-2 text-sm text-accent">{t('marketProfileRecommendation')}: {profileSource || t('marketNoProfile')}</p>
          </div>
        </div>
      </section>

      <section className="sticky top-24 z-30 rounded-3xl border border-line bg-ink/90 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'verified', 'discovered'] as const).map((tier) => <button key={tier} className={qualityTier === tier ? 'button px-4 py-2' : 'button-secondary px-4 py-2'} onClick={() => setQualityTier(tier)}>{tier === 'all' ? t('qualityAll') : tier === 'verified' ? t('qualityVerified') : t('qualityDiscovered')}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'aggressive', 'neutral', 'conservative'] as const).map((style) => <button key={style} className={tradingStyle === style ? 'button px-4 py-2' : 'button-secondary px-4 py-2'} onClick={() => setTradingStyle(style)}>{style === 'all' ? t('styleAll') : style === 'aggressive' ? t('styleAggressive') : style === 'neutral' ? t('styleNeutral') : t('styleConservative')}</button>)}
          </div>
          <label className="text-sm text-slate-300">{t('marketSort')}
            <select className="input mt-1" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="recommended">{t('marketSortRecommended')}</option>
              <option value="pnl">{t('marketSortPnl')}</option>
              <option value="sharpe">{t('marketSortSharpe')}</option>
              <option value="price">{t('marketSortPrice')}</option>
              <option value="latest">{t('marketSortLatest')}</option>
            </select>
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">{filtered.length} {t('marketSignals')}</h2>
        <div className="text-sm text-slate-400">{t('marketVerifiedCount')}: {verified.length} · {t('marketDiscoveredCount')}: {discovered.length}</div>
      </div>
      {filtered.length === 0 ? <div className="card border-warning/40 text-warning">{t('marketNoSignals')}</div> : null}
      {verified.length > 0 ? <SignalSection title={t('marketVerifiedSection')} signals={verified} /> : null}
      {discovered.length > 0 ? <SignalSection title={t('marketDiscoverySection')} signals={discovered} /> : null}
    </div>
  );
}

function SignalSection({ title, signals }: { title: string; signals: Signal[] }) {
  return (
    <section className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">{title}</div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)}
      </div>
    </section>
  );
}
