'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockStats } from '@/lib/mock-data';
import { useI18n } from './I18nProvider';
import { StatusChip } from './StatusChip';

export function LandingClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const profile = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
    if (profile) router.replace('/dashboard');
    else setChecked(true);
  }, [router]);

  if (!checked) return <div className="card animate-pulse text-slate-400">Loading…</div>;

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden bg-ink/90 p-8 md:p-12">
        <div className="flex flex-wrap gap-2"><StatusChip label="Base" tone="accent" /><StatusChip label="mock indexer · live tx" tone="success" /></div>
        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">{t('landingTitle')}</h1>
        <p className="mt-5 max-w-3xl whitespace-pre-line text-lg text-slate-300">{t('landingSubtitle')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/onboarding" className="button">{t('landingStart')}</Link>
          <Link href="/market" className="button-secondary">{t('landingBrowse')}</Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="card"><div className="text-sm text-slate-400">{t('landingIndexed')}</div><div className="mt-2 text-5xl font-black text-accent">{mockStats.totalIndexed.toLocaleString()}</div></div>
        <div className="card"><div className="text-sm text-slate-400">{t('landingTodaySignals')}</div><div className="mt-2 text-5xl font-black text-success">{mockStats.todaySignals.toLocaleString()}</div></div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">{t('landingDemoPath')}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[t('landingStep1'), t('landingStep2'), t('landingStep3'), t('landingStep4')].map((step, index) => (
            <div key={step} className="rounded-2xl border border-line bg-ink/60 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-accent font-black text-ink">{index + 1}</div>
              <p className="text-sm font-semibold text-slate-200">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
