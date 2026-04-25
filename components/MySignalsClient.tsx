'use client';

import { useEffect, useState } from 'react';
import { splitRevenue } from '@/lib/derived-revenue';
import type { DerivedRelation, Signal, UserProfile } from '@/lib/types';
import { SignalCard } from './SignalCard';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';

function shorten(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function MySignalsClient({ profile, signals, relations }: { profile?: UserProfile; signals: Signal[]; relations: DerivedRelation[] }) {
  const { t } = useI18n();
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile ?? null);
  const [openTree, setOpenTree] = useState<Record<string, boolean>>({});
  const consent = Boolean((profile ?? localProfile)?.consentToIndexing);

  useEffect(() => {
    if (profile) return;
    const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
    if (!raw) return;
    try {
      setLocalProfile(JSON.parse(raw) as UserProfile);
    } catch {
      setLocalProfile(null);
    }
  }, [profile]);

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap gap-2"><StatusChip label={consent ? t('mySignalsConsentGranted') : t('mySignalsConsentRequired')} tone={consent ? 'success' : 'danger'} /><StatusChip label={t('mySignalsDepthFlattened')} tone="accent" /></div>
        <h1 className="mt-4 text-4xl font-black">{t('mySignalsTitle')}</h1>
        <p className="mt-2 text-slate-300">{t('mySignalsSubtitle')}</p>
      </section>
      {!consent ? <div className="card border-danger/40 text-danger">{t('mySignalsBlocked')}</div> : null}
      {consent && signals.length === 0 ? (
        <section className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-line bg-ink text-3xl">↗</div>
          <h2 className="text-2xl font-black">{t('emptyMySignalsTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-400">{t('emptyMySignalsDescription')}</p>
        </section>
      ) : null}
      {consent && signals.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {signals.map((signal) => {
            const relation = relations.find((item) => item.derivedSignalId === signal.id);
            const derivedOwnerShare = splitRevenue('derived', signal.priceUsdc, 'indexed').derivedOwner ?? 0;
            const childCount = relations.filter((item) => item.parentSignalId === signal.id).length;
            const treeOpen = Boolean(openTree[signal.id]);
            return (
              <article key={signal.id} className="space-y-4">
                <SignalCard signal={signal} href={`/market/${signal.rootSignalId ?? signal.parentSignalId ?? signal.id}`} />
                <section className="card space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('mySignalsSales')}</div><div className="mt-1 text-2xl font-black">{signal.totalSales}</div></div>
                    <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('mySignalsRevenue')}</div><div className="mt-1 text-2xl font-black text-success">{(signal.totalSales * derivedOwnerShare).toFixed(2)} USDC</div></div>
                  </div>
                  <div className="rounded-2xl border border-line bg-ink/60 p-4 text-sm text-slate-300">
                    <div className="mb-2 font-bold text-white">{t('mySignalsLineage')}</div>
                    <div>{t('detailOriginal')}: <span className="font-mono text-accent">{shorten(signal.rootSignalId ?? signal.parentSignalId ?? signal.id)}</span></div>
                    <div>depth: {signal.derivedDepth}</div>
                    <div>{childCount} {t('mySignalsChildCount')}</div>
                    {relation ? <div className="mt-2 break-all text-xs text-slate-500">evidence: {relation.evidenceTxHashes.join(', ')}</div> : null}
                  </div>
                  <button className="button-secondary w-full" type="button" onClick={() => setOpenTree((current) => ({ ...current, [signal.id]: !treeOpen }))}>
                    {t('mySignalsTree')} {treeOpen ? '−' : '+'}
                  </button>
                  {treeOpen ? (
                    <div className="rounded-2xl border border-line bg-ink/70 p-4 text-sm">
                      <div className="font-mono text-slate-400">root: {shorten(signal.rootSignalId ?? signal.id)}</div>
                      <div className="ml-5 mt-2 font-mono text-accent">└─ mine: {shorten(signal.id)}</div>
                      {childCount > 0 ? <div className="ml-10 mt-2 text-slate-500">└─ {childCount} derived child</div> : null}
                    </div>
                  ) : null}
                </section>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
